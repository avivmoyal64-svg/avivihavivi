import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
W_,H_=700,939
bg=Image.new('RGB',(W_,H_),(6,6,8))
a=np.zeros((H_,W_,3),float)
yy,xx=np.mgrid[0:H_,0:W_]
glow=np.exp(-(((xx-520)/330)**2+((yy-420)/420)**2))
a+= glow[...,None]*np.array([28,30,36])
bg=Image.fromarray((a+np.array([6,6,8])).clip(0,255).astype('uint8'))
body=Image.open('luna_body.webp').convert('RGBA')
# ghosted faded copy behind (left-top), like Vallejos background
gh=body.resize((560,563),Image.LANCZOS); g=gh.convert('LA').convert('RGBA'); 
al=np.asarray(g.split()[3]).astype(float)*0.13*np.clip((563-np.arange(563))/200,0,1)[:,None]; g.putalpha(Image.fromarray(al.astype('uint8')))
base=bg.convert('RGBA'); base.alpha_composite(g,(-40,40))
# main body, right side, fade bottom
B=body.resize((600,603),Image.LANCZOS)
bal=np.asarray(B.split()[3]).astype(float); fade=np.clip((603-np.arange(603))/160,0,1)[:,None]; B.putalpha(Image.fromarray((bal*fade).astype('uint8')))
B2=Image.new('RGBA',(520,700),(0,0,0,0)); B2.paste(B,(0,0))
base.alpha_composite(B,(215,300))
img=base.convert('RGB'); d=ImageDraw.Draw(img)
def rob(sz,w,wd,it=False): F=ImageFont.truetype(ROBOTO,sz); F.set_variation_by_axes([w,wd]); return F
# Title
d.text((22,38),'SANTIAGO',font=font(62),fill=(240,240,240))
d.text((300,62),'«BORDER BOY»',font=font(28),fill=(80,150,230))
# LUNA with Mexico flag fill
F=font(104); txt='LUNA'; bb=d.textbbox((0,0),txt,font=F)
m=Image.new('L',(bb[2]+10,bb[3]+10),0); ImageDraw.Draw(m).text((0,0),txt,font=F,fill=255)
fl=Image.new('RGB',m.size); w3=m.size[0]
fa=np.zeros((m.size[1],w3,3),float); xs=np.arange(w3)/w3
col=np.where(xs<0.34,0,np.where(xs<0.66,1,2))
C=np.array([[0,135,70],[245,245,245],[206,17,38]])
fa[:]=C[col][None,:,:]
shade=np.linspace(1.08,0.78,m.size[1])[:,None,None]
fl=Image.fromarray((fa*shade).clip(0,255).astype('uint8'))
img.paste(fl,(22,100),m)
d.text((24,232),'UFC',font=font(40),fill=(70,140,220)); d.text((96,232),'CAREER',font=font(40),fill=(240,240,240))
# tiles 2x2 like Vallejos
TW,TH=153,210
frame=(110,150,205)
slots=[(24,324),(191,324),(24,596),(191,596)]
faces=[('aleksandre-topuria',None,False,'TOPURIA','W BY DEC'),('bryce-mitchell',None,True,'MITCHELL','L BY SUB'),('pacheco','espn',False,'PACHECO','W BY DEC'),('quangle','espn',False,'QUANG LE','W BY TKO')]
for (x,y),(slug,kind,grey,nm,sub) in zip(slots,faces):
    d.rectangle([x,y,x+TW-1,y+TH-1],fill=(6,6,8),outline=frame,width=3)
    f=face_local(slug,crop=(45,0,275,230)) if kind is None else Image.open(f'face_{slug}.webp').convert('RGBA')
    if grey: f=grey_rgba(f)
    if kind is None: f2=f.resize((int(TH*1.2),int(TH*1.2)),Image.LANCZOS); off=(-8)
    else: f2=f.resize((TW-6,int((TW-6)*f.height/f.width)),Image.LANCZOS); f2=f2.resize((int(f2.width*1.32),int(f2.height*1.32)),Image.LANCZOS); off=-2
    lay=Image.new('RGBA',(TW-6,TH-6),(0,0,0,0)); lay.paste(f2,((TW-6-f2.width)//2,off),f2)
    t=img.convert('RGBA'); t.alpha_composite(lay,(x+3,y+3)); img.paste(t.convert('RGB'))
    d=ImageDraw.Draw(img)
    def spaced(txt,F,cy,colr,sp):
        ws=[(d.textbbox((0,0),ch,font=F)[2]-d.textbbox((0,0),ch,font=F)[0]) if ch!=' ' else F.size*0.3 for ch in txt]
        tot=sum(ws)+sp*(len(txt)-1); xx=x+TW/2-tot/2; b0=d.textbbox((0,0),'H',font=F)
        for ch,w in zip(txt,ws):
            if ch!=' ': d.text((xx-d.textbbox((0,0),ch,font=F)[0],cy-(b0[1]+b0[3])/2),ch,font=F,fill=colr)
            xx+=w+sp
    spaced(nm,rob(23,450,75),y+TH+16,(232,232,232),2.2)
    spaced(sub,rob(15,450,75),y+TH+37,(110,160,95) if sub[0]=='W' else (200,70,70),1.6)
img.save('/home/claude/work/out_santiago-luna.jpg',quality=92)
