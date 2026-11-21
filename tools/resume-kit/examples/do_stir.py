import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
slots=[(10,150),(10,316),(10,475),(137,475),(10,638),(137,638)]
names=[('W',G_,'PROCHAZKA'),('W',G_,'BLACHOWICZ'),('W',G_,'CUTELABA'),('W',G_,'LOPES'),('W',G_,'BELLATO'),('W',G_,'ERSLAN'),('W',G_,'TOKKOS')]
rebuild('navajo-stirling',96,127,slots,0,(14,154,101,250),(32,251,79,276),face_local('jiri-prochazka',crop=(80,10,240,170)),'KO',names,1,26,21,(137,316),0,lab_size=19,face_scale=1.3,face_top=-0.08,bgcols=[5,90],ncolor=(95,150,215),name_pad=16,order=[(10,150),(10,316),(137,316),(10,475),(137,475),(10,638),(137,638)])
