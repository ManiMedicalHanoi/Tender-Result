#!/usr/bin/env python3
"""MMH Daily — tạo file podcast MP3 từ kịch bản trong data/editions/<ngày>.json.

Giọng: edge-tts (giọng neural Microsoft, miễn phí). Lỗi ⇒ thử lại; hỏng hẳn ⇒ Piper (offline) nếu đã cài.
Nhạc hiệu mở / kết tự tạo bằng ffmpeg (hợp âm khác nhau theo chương trình). Âm lượng chuẩn -16 LUFS, MP3 mono 64 kbps.
Ghi lại mốc thời gian từng lượt lời (turns[i].t) để app chạy phụ đề theo giọng đọc.

Chạy: python3 tools/audio.py [ngày yyyy-mm-dd]   (cần ffmpeg + pip install edge-tts)
"""
import asyncio, json, os, subprocess, sys, tempfile, shutil, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SR = 24000
CHORDS = {  # nhạc hiệu: nốt gốc (Hz) theo chương trình
    'briefing': [392.0, 493.9, 587.3], 'twotakes': [349.2, 440.0, 523.3], 'healthdesk': [329.6, 415.3, 493.9],
    'markets': [293.7, 370.0, 440.0], 'editor': [261.6, 329.6, 392.0], 'explainer': [440.0, 523.3, 659.3], 'weekly': [311.1, 392.0, 466.2],
}
PIPER = {'A': 'en_US-lessac-medium', 'B': 'en_GB-alan-medium'}


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def dur(p):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)], capture_output=True, text=True).stdout.strip()
    return float(out or 0)


def jingle(path, notes, length=3.2, rev=False):
    """Hợp âm rải nhẹ: 3 nốt nối nhau, tắt dần; rev = bản kết (rải ngược, ngắn hơn)."""
    seq = list(reversed(notes)) if rev else notes
    parts = []
    for i, f in enumerate(seq):
        t0 = i * 0.18
        parts.append(f"0.16*sin(2*PI*{f}*t)*exp(-2.4*(t-{t0}))*gt(t,{t0})")
        parts.append(f"0.05*sin(2*PI*{f*2}*t)*exp(-3.5*(t-{t0}))*gt(t,{t0})")
    expr = '+'.join(parts)
    run(['ffmpeg', '-y', '-f', 'lavfi', '-i', f"aevalsrc='{expr}':s={SR}:d={length}", '-af', f'afade=t=out:st={length-0.8}:d=0.8', '-ac', '1', str(path)])


def silence(path, sec):
    run(['ffmpeg', '-y', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', str(sec), str(path)])


async def tts_edge(text, voice, out, rate):
    import edge_tts
    for i in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(out))
            if out.exists() and out.stat().st_size > 1000:
                return True
        except Exception as e:  # mạng chập chờn / bị giới hạn ⇒ thử lại
            print(f'  edge-tts lỗi ({voice}, lần {i+1}): {e}')
        await asyncio.sleep(2 * (i + 1))
    return False


def tts_piper(text, sp, out):
    model = PIPER.get(sp, PIPER['A'])
    try:
        subprocess.run([sys.executable, '-m', 'piper', '-m', model, '-f', str(out)], input=text.encode(), check=True, capture_output=True, timeout=120)
        return out.exists()
    except Exception as e:
        print('  piper lỗi:', e)
        return False


async def main():
    date = sys.argv[1] if len(sys.argv) > 1 else None
    eds = ROOT / 'data' / 'editions'
    if not date:
        date = sorted(p.stem for p in eds.glob('*.json'))[-1]
    ed_path = eds / f'{date}.json'
    ed = json.loads(ed_path.read_text())
    pod = ed['podcast']
    voices = {h['id']: h['voice'] for h in pod['hosts']}
    tmp = Path(tempfile.mkdtemp())
    t_start = time.time()

    # 1. giọng đọc từng lượt (song song 4 lượt)
    sem = asyncio.Semaphore(4)
    rate = os.environ.get('DAILY_RATE', '+0%')
    engine = {'edge': 0, 'piper': 0, 'fail': 0}

    async def one(i, turn):
        mp3 = tmp / f't{i:03d}.mp3'
        async with sem:
            ok = await tts_edge(turn['text'], voices.get(turn['sp'], list(voices.values())[0]), mp3, rate)
        if ok:
            engine['edge'] += 1
            return mp3
        wav = tmp / f't{i:03d}.wav'
        if tts_piper(turn['text'], turn['sp'], wav):
            engine['piper'] += 1
            return wav
        engine['fail'] += 1
        return None

    files = await asyncio.gather(*[one(i, t) for i, t in enumerate(pod['turns'])])
    if engine['fail'] > len(files) * 0.2:
        sys.exit(f'Quá nhiều lượt không tạo được giọng: {engine}')

    # 2. ghép: nhạc hiệu · lời · nhạc kết; ghi mốc thời gian
    notes = CHORDS.get(pod['show'], CHORDS['briefing'])
    intro, outro = tmp / 'intro.wav', tmp / 'outro.wav'
    jingle(intro, notes, 3.2)
    jingle(outro, notes, 2.6, rev=True)
    gaps = {k: tmp / f'gap{k}.wav' for k in ('s', 'm')}
    silence(gaps['s'], 0.35)
    silence(gaps['m'], 0.6)
    seq, t = [], 0.0
    seq.append(intro); t += dur(intro)
    prev = None
    for i, f in enumerate(files):
        turn = pod['turns'][i]
        if f is None:
            turn['t'] = None
            continue
        wav = tmp / f'n{i:03d}.wav'
        run(['ffmpeg', '-y', '-i', str(f), '-ar', str(SR), '-ac', '1', str(wav)])
        if prev is not None:
            g = gaps['s'] if prev == turn['sp'] else gaps['m']
            seq.append(g); t += dur(g)
        turn['t'] = round(t, 2)
        seq.append(wav); t += dur(wav)
        prev = turn['sp']
    seq.append(gaps['m']); seq.append(outro)

    lst = tmp / 'list.txt'
    lst.write_text(''.join(f"file '{p}'\n" for p in seq))
    raw = tmp / 'raw.wav'
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(raw)])
    out_dir = ROOT / 'audio'
    out_dir.mkdir(exist_ok=True)
    mp3 = out_dir / f'{date}.mp3'
    title = pod.get('title', 'MMH Daily')
    run(['ffmpeg', '-y', '-i', str(raw), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', str(SR), '-ac', '1', '-b:a', '64k',
         '-metadata', f'title={title}', '-metadata', 'artist=MMH Daily', '-metadata', 'album=MMH Daily', '-metadata', f'date={date}', str(mp3)])
    pod['audio'] = {'file': f'audio/{date}.mp3', 'dur': round(dur(mp3), 1), 'bytes': mp3.stat().st_size, 'engine': engine}
    ed_path.write_text(json.dumps(ed, ensure_ascii=False, separators=(',', ':')))
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"Podcast {date}: {pod['audio']['dur']/60:.1f} phút · {pod['audio']['bytes']/1e6:.1f} MB · giọng {engine} · {time.time()-t_start:.0f} s")


if __name__ == '__main__':
    asyncio.run(main())
