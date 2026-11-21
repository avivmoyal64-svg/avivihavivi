import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
def rob(size,w=400):
    f=ImageFont.truetype(ROBOTO,size); f.set_variation_by_axes([w,100]); return f
img=load('melquizael-costa')
IY=317; BH=33
new=Image.new('RGB',(img.width,img.height+BH),(255,255,255))
new.paste(img.crop((0,0,img.width,IY)),(0,0))
new.paste(img.crop((0,IY,img.width,img.height)),(0,IY+BH))
band=img.crop((0,350,img.width,383))
new.paste(band,(0,IY))
d=ImageDraw.Draw(new)
bgc=band.getpixel((300,16))
d.rectangle([40,IY+1,img.width-25,IY+BH-2],fill=bgc)
f=rob(13.6)
def put(x,t,c):
    b=d.textbbox((0,0),'Hd',font=f); d.text((x, IY+15.5-(b[1]+b[3])/2),t,font=f,fill=c)
put(46,'Nov 14, 2026',(30,30,30)); put(144,'Jared Gordon',(30,30,30)); put(353,'W',(70,135,70)); put(391,'Decision - Unanimous',(85,92,92))
new.save('/home/claude/work/out_melquizael-costa.jpg',quality=95)
