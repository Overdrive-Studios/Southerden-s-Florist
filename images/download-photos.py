# Run once, before the old site goes offline, to copy every photo into this folder:
#   python3 download-photos.py
import urllib.request, urllib.parse, os
BASE = "https://www.southerdenflorist.com/contents/media/"
here = os.path.dirname(os.path.abspath(__file__))
FILES = ['l_roses-chocs_20180610171710.jpg', 'lindt_assorted_235g_000.jpg', 'lindt_assorted_235g.jpg', 'helium_balloons_000.jpg', 'dsc_5770_000.jpg', '3_4_000.jpg', '840_000.jpg', 'dsc_1756_000.jpg', 'k_739.jpg', 'l_20131116_141251_001_20160428223044.jpg', 'l_20170204_160701_20170315232010.jpg', 'l_20170222_105919_.jpg', 'l_20170222_110008_.jpg', 'l_20170823_105554.jpg', 'l_20171013_111959.jpg', 'l_20171027_093735.jpg', 'l_20180406_154420.jpg', 'l_20190112_143342-aa.png', 'l_20191202_142446.jpg', 'l_20200131_173210.jpg', 'l_20200521_172430.jpg', 'l_20211125_094915.jpg', 'l_20260407aa_170959.jpg', 'l_20260408_143050.jpg', 'l_20260410_152322_20260426181401.jpg', 'l_272_20160203224110.jpg', 'l_316_20160316222927.jpg', 'l_754_000.jpg', 'l_766_000.jpg', 'l_768_001.jpg', 'l_774_000.jpg', 'l_780_000.jpg', 'l_787_000.jpg', 'l_801_000.jpg', 'l_818.jpg', 'l_821_000.jpg', 'l_Casket.jpg', 'l_IMG_20210423_132257.jpg', 'l_affordable.jpg', 'l_babyaids1_002_20160316224217.jpg', 'l_ceramic-bowl.jpg', 'l_dsc_1539a.gif', 'l_dsc_9975_001_000.jpg', 'l_flowers%20and%20chocolates_000.jpg', 'l_h249_001_20160214233544_000_.jpg', 'l_img_1173a_20160111011517.jpg', 'l_img_1784_000_20160429224024.jpg', 'l_img_1790_20160421224104.jpg', 'l_k_750.jpg', 'l_mdwb_000.jpg', 'l_nats-phone-245a.jpg', 'l_sweet-savoury_20180103121704.jpg', 'l_tenderness_pink_and_white_basket__73010.jpg', 'm84%20%28250x250%29_000.jpg', 't_20171013_112152-%282%29_20260407173116.jpg', 't_769_000_20171116150117_20260702214018.jpg', 't_770_000_20171116150117_20260702214432.jpg', 't_DSC_0231.jpg', 't_dsc_9822-%28800x530%29_000.jpg', 't_img_1825_001_20260704085040.jpg', 't_k_20170602_102000_000.jpg', 't_k_789_000.jpg', 't_posybowl_000_20171116150118.jpg']
MAGIC = (b"\xff\xd8", b"\x89PNG", b"GIF8", b"RIFF")
for f in FILES:
    dest = os.path.join(here, urllib.parse.unquote(f))
    if os.path.exists(dest) and open(dest, "rb").read(4).startswith(MAGIC):
        print("have", f); continue          # never replace a good photo
    try:
        req = urllib.request.Request(BASE + f, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=30).read()
        if not data.startswith(MAGIC):
            print("SKIP", f, "(site returned a web page, not an image)"); continue
        open(dest, "wb").write(data)
        print("ok  ", f)
    except Exception as e:
        print("FAIL", f, e)
