# Downloads the current official logos of the organisations Southerden's supports.
import urllib.request, os
here = os.path.dirname(os.path.abspath(__file__))
LOGOS = {
    "toowoomba-hospice.png": "https://d6jlip2ek0t2a.cloudfront.net/i92xx8t0tgoow.png",
    "interflora.png": "https://ap-southeast-2.graphassets.com/ATiqqtzyoTiOAZl8LqH47z/cmo8miurk8oya072pdm12pbhs",
}
for name, url in LOGOS.items():
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "image/png,image/*"})
        data = urllib.request.urlopen(req, timeout=30).read()
        open(os.path.join(here, name), "wb").write(data)
        print("ok  ", name, len(data), "bytes")
    except Exception as e:
        print("FAIL", name, e)
