import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
import tilekit
def redfill(img,box,sample_x=None,top_frac=0.55):
    x0,y0,x1,y1=box; h=y1-y0
    t=np.linspace(0,1,h)[:,None,None]**0.7
    c1=np.array([6,4,6]);c2=np.array([120,5,15])
    img.paste(Image.fromarray(np.repeat((c1*(1-t)+c2*t),x1-x0,axis=1).astype('uint8')),(x0,y0))
tilekit.bg_fill=redfill
import tilekit as T; T.erase_mask=lambda img,box,k=11: T.erase_text(img,box,k=15)
slots=[(37,169),(37,334),(153,334),(37,512),(153,512),(37,691),(153,691),(267,691)]
order=[(37,169),(37,334),(153,334),(37,512),(153,512),(267,512),(37,691),(153,691),(267,691)]
N=[('W','JOHNSON'),('W','PEREZ'),('W','OCHOA'),('L','KAPE'),('W','NICOLAU'),('W','JOHNSON'),('W','CJ'),('W','OSBOURNE')]
names=[('L',R_,'HORIGUCHI')]+[(l,G_ if l=='W' else R_,n) for l,n in N]
rebuild('asu-almabayev',102,127,slots,0,(42,175,135,281),(67,272,111,294),grey_rgba(face_local('kyoji-horiguchi')),'DEC',names,4,28,21,None,0,lab_size=20,lab_inset=3,face_scale=1.45,face_top=-0.12,name_pad=14,order=order,ncolor=(240,240,240))
