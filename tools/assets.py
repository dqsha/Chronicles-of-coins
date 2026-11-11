from PIL import Image
import os,sys
os.makedirs('assets/out',exist_ok=True)
def key(im):
    im=im.convert('RGBA');px=im.load();w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if r>150 and b>150 and g<120 and abs(r-b)<90: px[x,y]=(0,0,0,0)
    return im
def proc(name,width):
    im=key(Image.open('assets/src/%s.jpg'%name))
    bb=im.getchannel('A').point(lambda v:255 if v>0 else 0).getbbox()
    im=im.crop(bb)
    # kill magenta fringe: pixels with strong magenta tint on edges
    px=im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r,g,b,a=px[x,y]
            if a and r>110 and b>110 and g<r*0.55 and g<b*0.55: px[x,y]=(0,0,0,0)
    h=round(im.size[1]*width/im.size[0])
    im=im.resize((width,h),Image.LANCZOS)
    im.save('assets/out/%s.png'%name,optimize=True)
    print(name,im.size,os.path.getsize('assets/out/%s.png'%name))
for n in ['btn-red','btn-green','btn-gold','btn-gray','btn-pressed']:proc(n,240)
proc('panel-stone',360)
