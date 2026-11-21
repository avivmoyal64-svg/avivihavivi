import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
import tilekit
_orig=tilekit.bg_fill
def redfill(img,box,sample_x=None,top_frac=0.55):
    if box[1]==0 and box[3]<=14: return _orig(img,box,sample_x,top_frac)
    x0,y0,x1,y1=box; h=y1-y0
    t=np.linspace(0,1,h)[:,None,None]
    c1=np.array([120,8,12]);c2=np.array([205,22,28])
    blk=np.repeat((c1*(1-t)+c2*t),x1-x0,axis=1).astype('uint8')
    img.paste(Image.fromarray(blk),(x0,y0))
tilekit.bg_fill=redfill
X=[8,100,190,282,375,468]
rows=[(183,3),(324,4),(463,5),(603,5),(742,6)]
slots=[(X[i],y) for y,n in rows for i in range(n)]
order=[(X[0],183),(X[1],183),(X[2],183),(X[3],183)]+slots[3:]
N=[('W','ZALAL'),('W','ORTEGA'),('L','MOSVAR'),('W','KATTAR'),('L',"O'MALLEY"),('W','CEJUDO'),('W','DILLASHAW'),('W','YAN'),('W','YAN'),('W','SANDHAGEN'),('W','MUNHOZ'),('W','RIVERA'),('W','STAMANN'),('W','JOHNS'),('L','MORAES'),('W','BARAO'),('W','MENDES'),('L','RAPHAEL'),('L','CARAWAY'),('W','EDUARDO'),('W','MIZUGAKI'),('W','VIANA'),('W','GIBSON')]
names=[('L',R_,'VALLEJOS')]+[(l,G_ if l=='W' else R_,n) for l,n in N]
rebuild('aljamain-sterling',82,116,slots,1,(103,198,176,283),(122,274,156,298),grey_rgba(face_local('kevin-vallejos')),'DEC',names,0,20,16,None,0,lab_size=15,lab_inset=2,lab_fill=(250,250,250),face_scale=1.5,face_top=-0.2,bgcols=[9,69],name_pad=10,order=order,erase_above=0,top_fill=14)
