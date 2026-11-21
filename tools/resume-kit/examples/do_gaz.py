import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('shamil-gaziev'); src=img.copy()
r1=[(40,385),(146,385),(252,385),(357,385)]; S1=(95,115)
r2=[(40,537),(166,537),(290,537)]; S2=(109,114)
c1=[src.crop((x,y,x+S1[0],y+S1[1])) for x,y in r1]
c2=[src.crop((x,y,x+S2[0],y+S2[1])) for x,y in r2]
# new tile from template c1[1] (Pericic, loss tile)
t=c1[1].copy()
inner=(5,5,90,92)
def fill(im,box):
    x0,y0,x1,y1=box; im.paste(Image.new('RGB',(x1-x0,y1-y0),(4,4,4)),(x0,y0))
fill(t,inner)
put_face(t,inner,grey_rgba(face_local('tallison-teixeira',crop=(50,0,270,220))),scale=1.25,top_off=-0.06)
lab=src.crop((146+24,385+92,146+72,385+113)); t.paste(lab,(24,92))
li=(27,95,69,110); solid(t,li,(250,250,250)); text_center(t,li,'DEC',17,(10,10,10))
H=img.height; EXT=150
ext=img.crop((0,H-EXT,img.width,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(16)); ext=Image.eval(ext,lambda v:int(v*0.5))
out=Image.new('RGB',(img.width,H+EXT)); out.paste(img,(0,0)); out.paste(ext,(0,H))
seam=out.crop((0,H-30,img.width,H+30)).filter(ImageFilter.GaussianBlur(10)); out.paste(seam,(0,H-30))
# clear old tiles + names
erase_text(out,(38,535,151,653),k=31)
erase_text(out,(25,499,385,528),k=21)
inpaint_text(out,(380,496,480,530))
erase_text(out,(25,652,420,682),k=21)
# re-lay
out.paste(t,r1[0]); out.paste(c1[0],r1[1]); out.paste(c1[1],r1[2]); out.paste(c1[2],r1[3])
out.paste(c1[3],(40+7,537)); out.paste(c2[0],r2[1]); out.paste(c2[1],r2[2])
out.paste(c2[2],(40,690))
d=ImageDraw.Draw(out)
def rob(sz,w,wd): F=ImageFont.truetype(ROBOTO,sz); F.set_variation_by_axes([w,wd]); return F
def nm(cx,cy,l,name):
    Fl=font(24); Fn=rob(19 if len(name)<12 else 16,500,72)
    bl=d.textbbox((0,0),l,font=Fl); bn=d.textbbox((0,0),name,font=Fn)
    tot=(bl[2]-bl[0])+5+(bn[2]-bn[0]); x=cx-tot/2
    d.text((x-bl[0],cy-(bl[1]+bl[3])/2),l,font=Fl,fill=(40,150,45) if l=='W' else (200,30,35))
    d.text((x+(bl[2]-bl[0])+5-bn[0],cy-(bn[1]+bn[3])/2),name,font=Fn,fill=(238,238,238))
L=[(r1[0],S1,'L','TEIXEIRA'),(r1[1],S1,'W','NZECHUKWU'),(r1[2],S1,'L','PERICIC'),(r1[3],S1,'L','CORTES-ACOSTA'),((47,537),S1,'W','PETERSEN'),(r2[1],S2,'W','MAYES'),(r2[2],S2,'L','ROZENSTRUIK'),((40,690),S2,'W','BUDDAY')]
for (x,y),S,l,n in L:
    nm(x+S[0]/2, y+S[1]+14 if S==S1 else y+S[1]+19, l, n)
out.save('/home/claude/work/out_shamil-gaziev.jpg',quality=92)
