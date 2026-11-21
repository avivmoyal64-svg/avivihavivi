import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('yousri-belgaroui')
# label SOON -> DEC
solid(img,(50,413,80,428),img.getpixel((49,420)))
text_center(img,(48,412,82,430),'DEC',15,(40,40,40),dy=0)
# '?' -> red L
a=np.asarray(img).astype(float)
L=a[435:459,14]; Rr=a[435:459,33]
t=np.linspace(0,1,33-15)[None,:,None]
blk=(L[:,None,:]*(1-t)+Rr[:,None,:]*t).clip(0,255).astype('uint8')
img.paste(Image.fromarray(blk).filter(ImageFilter.GaussianBlur(1)),(15,435))
d=ImageDraw.Draw(img); f=font(20)
b=d.textbbox((0,0),'L',font=f)
d.text((21-b[0],447-(b[1]+b[3])/2),'L',font=f,fill=(215,35,35))
img.save('/home/claude/work/out_yousri-belgaroui.jpg',quality=93)
# grey out the whole Borralho photo (person only; keep orange bg and purple frame)
a=np.asarray(img).astype(int)
x0,y0,x1,y1=31,319,96,409
reg=a[y0:y1,x0:x1]
r,g,b=reg[...,0],reg[...,1],reg[...,2]
bg=((r-b)>110)&(r>160)
purple=(b>r+15)
person=~(bg|purple)
m=Image.fromarray((person*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
crop=img.crop((x0,y0,x1,y1))
grey=crop.convert('L').convert('RGB')
grey=Image.eval(grey,lambda v:int(v*0.95))
img.paste(Image.composite(grey,crop,m),(x0,y0))
img.save('/home/claude/work/out_yousri-belgaroui.jpg',quality=93)
