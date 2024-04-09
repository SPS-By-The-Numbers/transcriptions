#!/usr/bin/python

# Downloads audio and metadata from youtube into a directory structure.
#
# Audio from videos as well as metadata are downloaded into files by the name:
#
#  [video_id].mp4
#  [video_id].metadata.json
#
# The metadata is written last as a way of marking completion. If it is a
# parsable json file, then download was complete.
#
# On download, an empty file named
#  [video_id].new_download
#
# Is also created to allow for quick searches of new videos in the processing
# pipeline.
#
# Because there may be thousands of files, they are downloaded into a
# 1-level directory prefix tree based on the first character of the videoid.
# Since videoIds are base64 encoded, this gives a 64x reduction in directory
# entries. So abcde.mp4, ab123.mp4, -1abd.mp4 would be store as
#
# /mount_point/a/abcde.mp4
# /mount_point/a/ab123.mp4
# /mount_point/-/-1abd.mp4

#for testing, I'm using command line args
#py download_yt_audio.py -o "C:\Users\Joseph\Documents\test_out" -u "https://www.youtube.com/user/wanderbots/" -d

from pytube import YouTube
from pytube import Playlist
from pytube import Channel
from random import randint
from time import sleep

import argparse
import json
import logging
import os
import re
import sys
import traceback

def get_outfile_base(outdir, video_id):
    """Returns the output file path for video_id without extension"""
    return os.path.join(outdir, video_id[0], video_id)


def is_json_file(path):
    """Returns True if path exists and can be loaded as JSON."""
    try:
        with open(path, "r") as f:
            json.load(f)
            return True
    except:
            return False

def main():
    parser = argparse.ArgumentParser(
            prog='Youtube Audio Download',
            description='Downloads audio from youtube videos in a channel or playlist')
    parser.add_argument('-o', '--outdir', dest='outdir', metavar='OUTDIR',
                        help='write files in structure under OUTDIR', required=True)
    parser.add_argument('-u', '--url', dest='url', metavar="URL",
                        help='URL of playlist or channel  to download from', required=True)
    parser.add_argument('-d', '--debug', dest='debug', help='Enable debug logging', action=argparse.BooleanOptionalAction)
    parser.add_argument('-s', '--skip-existing', dest='skip', help='Skip download of existing audio files. Only update metadata.', action=argparse.BooleanOptionalAction)
    
    args = parser.parse_args()
    if not args.url or not args.outdir:
        parser.print_help()
        sys.exit(1)
    
    videos = get_videos(args.url)
    
    for v in range(3):
        print(videos[v])
        manage_video(videos[v], args.outdir)
    

def get_videos(url):
    # Check URL structure against the smae regex pytube uses for checking if a url is a channel, otherwise, assume it's a playlist
    patterns = [
        r"(?:\/(c)\/([%\d\w_\-]+)(\/.*)?)",
        r"(?:\/(channel)\/([%\w\d_\-]+)(\/.*)?)",
        r"(?:\/(u)\/([%\d\w_\-]+)(\/.*)?)",
        r"(?:\/(user)\/([%\w\d_\-]+)(\/.*)?)"
    ]
    isChannelURL = False;
    for pattern in patterns:
        regex = re.compile(pattern)
        function_match = regex.search(url)
        if function_match:
            isChannelURL = True;
            break
    if isChannelURL:
        videos = Channel(url).video_urls
    else:
        videos = Playlist(url).videos
    
    return videos

def manage_video(v, outdir):
    # Check if json file exists for video and is parseable.
    video_id = v.split('=')[1]
    outfile_base = get_outfile_base(outdir, video_id)
    metadata_path = '%s.metadata.json' % outfile_base
    
    if is_json_file(metadata_path):
        logging.info("Skipping %s" % video_id)
    else:
        logging.info("Downloading %s" % video_id)
        
        try:
            save_video(video_id, metadata_path, outfile_base)
            
        except Exception as e:
            print("Download of %s Failed with exception %s" % (video_id, e))
            traceback.print_exc()
    pause_secs = randint(1,5)
    sleep(pause_secs)

def save_video(video_id, metadata_path, outfile_base):
    vid = YouTube.from_id(video_id)
    
    # Ensure the files are there.
    outfile_name = '%s.mp4' % video_id
    outfile_dir = os.path.dirname(outfile_base)
    os.makedirs(outfile_dir, exist_ok=True)
    
    #don't download the audio, but I'm not deleting this yet in case I turn out to need it later
    if(False):
        # Do the download, always overwriting. The parseable metadata file is the
        # completion flag.
        audio_streams = vid.streams.filter(only_audio=True).order_by('abr')
        audio_streams.first().download(
                output_path=outfile_dir,
                filename=outfile_name,
                max_retries=5,
                #this is meant to be based on a command line argument, but this is fine for now
                skip_existing=True)
    
    # Download completed. Time to write metadata.
    with open(metadata_path, "w") as f:
        metadata = {
            'title': vid.title,
            'video_id': vid.video_id,
            'channel_id': vid.channel_id,
            'description': vid.description,
            'publish_date': vid.publish_date.isoformat(),
        }
        print(metadata)
        json.dump(metadata, f)
    logging.info("Done Downloading %s" % video_id)

if(__name__ == "__main__"):
    main()


