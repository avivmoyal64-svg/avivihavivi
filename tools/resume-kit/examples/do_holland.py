import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
def rob(size,w=400):
    f=ImageFont.truetype(ROBOTO,size); f.set_variation_by_axes([w,100]); return f
img=load('kevin-holland')
BH=30
new=Image.new('RGB',(img.width,img.height+BH),(255,255,255)); new.paste(img,(0,BH))
d=ImageDraw.Draw(new)
band=img.crop((0,28,img.width,58))
new.paste(band,(0,0))
d.rectangle([14,2,img.width-12,BH-3],fill=band.getpixel((200,15)))
f=rob(13)
def put(x,t,c):
    b=d.textbbox((0,0),'Hd',font=f); d.text((x, 14.5-(b[1]+b[3])/2),t,font=f,fill=c)
put(21,'Nov 14, 2026',(25,25,25)); put(118,'Uros Medic',(25,25,25)); put(261,'D',(120,120,120)); put(298,'Draw - Majority',(65,72,72))
new.save('/home/claude/work/out_kevin-holland.jpg',quality=95)
