import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
slots=[(13,142),(112,142),(13,292),(112,292),(13,442),(112,442),(13,592),(112,592),(214,592)]
names=[('L',R_,'STIRLING'),('L',R_,'ULBERG'),('W',G_,'ROUNTREE'),('W',G_,'HILL'),('L',R_,'PEREIRA'),('W',G_,'RAKIC'),('L',R_,'PEREIRA'),('W',G_,'TEIXEIRA'),('W',G_,'REYES'),('W',G_,'OEZDEMIR')]
rebuild('jiri-prochazka',90,115,slots,1,(116,146,198,236),(136,232,180,257),grey_rgba(face_local('navajo-stirling')),'KO',names,0,28,22,(13,742),175,lab_size=19,face_scale=1.2,face_top=-0.03,bgcols=[6,83])
