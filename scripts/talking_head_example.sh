#!/bin/bash
# Talking-head version of one clip: the board moves up and shrinks, and the speaker, cut out of the
# source video, stands in front of it at the bottom.
#   usage: talking_head_example.sh <clip-folder> <source-video> [light]
# <clip-folder> is one of clip_audio.py's folders, with its scene already rendered there as out.mp4
# (and out-light.mp4 for the light version). The cutout is the slow part, so it is made once per clip
# (cutout.mov) and reused for every look.
# CROP (w:h:x:y) is where the speaker sits in the source frame. The default fits one 1920x1080 video:
# look at a frame of yours and set your own, above any captions burned onto the speaker.
set -e -o pipefail
[ -d "$1" ] && [ -f "$2" ] || { echo "usage: $0 <clip-folder> <source-video> [light]"; exit 1; }
K="$(cd "$(dirname "$0")" && pwd)"; c="$1"; CUT="$K/cutout"; CROP="${CROP:-1000:780:460:50}"
W=$(echo "$CROP" | cut -d: -f1); H=$(echo "$CROP" | cut -d: -f2)
[ -x "$CUT" ] || swiftc -O "$K/cutout.swift" -o "$CUT"
if [ ! -s "$c/cutout.mov" ]; then
  src=$(head -1 "$c/words.txt" | sed -E 's/.*\(source ([0-9]+):([0-9.]+) to.*/\1 \2/')
  t0=$(echo $src | awk '{printf "%.2f", $1*60+$2}')
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$c/audio.wav")
  ffmpeg -v error -ss "$t0" -t "$dur" -i "$2" -vf "fps=30,crop=$CROP" -f rawvideo -pix_fmt bgra - \
   | "$CUT" "$W" "$H" \
   | ffmpeg -y -v error -f rawvideo -pix_fmt bgra -s "${W}x${H}" -r 30 -i - -vf "scale=780:-2:flags=lanczos" \
       -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -an "$c/cutout.tmp.mov"
  mv "$c/cutout.tmp.mov" "$c/cutout.mov"
fi
if [ "$3" = light ]; then board="$c/out-light.mp4"; bg=0xFBFBF8; out="$c/head-light.mp4"; else board="$c/out.mp4"; bg=0x111111; out="$c/head.mp4"; fi
# Soft left and right edges: shoulders and hands that run past the crop fade out instead of ending in a straight line.
dim=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$c/cutout.mov")
ffmpeg -y -v error -i "$c/cutout.mov" -i "$board" -f lavfi -i "color=white:s=$dim:d=1,format=gray,geq=lum='255*min(1,min(X,W-1-X)/90)'" -filter_complex "
    color=c=$bg:s=1080x1920:r=30[bg];
    [1:v]crop=1080:1410:0:150,scale=842:1100:flags=lanczos[b];
    [bg][b]overlay=(W-w)/2:110:shortest=1[v1];
    [2:v]trim=end_frame=1,loop=loop=-1:size=1,setpts=N/30/TB[m];
    [0:v]format=yuva420p,split[hc][ha];
    [ha]alphaextract[a0];
    [a0][m]blend=all_mode=multiply:shortest=1[a1];
    [hc][a1]alphamerge,tpad=stop_mode=clone:stop_duration=2[h];
    [v1][h]overlay=(W-w)/2:1100:shortest=1[v]" \
  -map "[v]" -map 1:a -c:a copy -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart "$out.tmp.mp4"
mv "$out.tmp.mp4" "$out"
echo "$(basename "$c") ${3:-dark} $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")s"
