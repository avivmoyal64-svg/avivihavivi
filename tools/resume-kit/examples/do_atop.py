import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('aleksandre-topuria')
solid(img,(64,504,122,534),(252,252,250))
text_center(img,(62,502,124,536),'DEC',29,(10,10,10),dy=1)
a=np.asarray(img).astype(float)
L=a[548:584,6]; Rr=a[548:584,31]
t=np.linspace(0,1,31-7)[None,:,None]
img.paste(Image.fromarray((L[:,None,:]*(1-t)+Rr[:,None,:]*t).clip(0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(1)),(7,548))
d=ImageDraw.Draw(img); f=font(33); b=d.textbbox((0,0),'L',font=f)
d.text((11-b[0],566-(b[1]+b[3])/2),'L',font=f,fill=(215,35,40))
# grey Luna (person only, keep red bg)
x0,y0,x1,y1=24,340,162,500
reg=np.asarray(img).astype(int)[y0:y1,x0:x1]; r,g,bb=reg[...,0],reg[...,1],reg[...,2]
bg=((r-g)>100)&((r-bb)>100)
m=Image.fromarray(((~bg)*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
crop=img.crop((x0,y0,x1,y1)); grey=crop.convert('L').convert('RGB')
img.paste(Image.composite(grey,crop,m),(x0,y0))
img.save('/home/claude/work/out_aleksandre-topuria.jpg',quality=93)
