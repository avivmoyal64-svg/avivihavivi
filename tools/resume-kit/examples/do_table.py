import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
def rob(size,w=400):
    f=ImageFont.truetype(ROBOTO,size); f.set_variation_by_axes([100,w]); return f
def add_row(slug,cells,shade,band_h,first_y_text,size,out,top_band_from=None, insert_y=0):
    img=load(slug)
    new=Image.new('RGB',(img.width,img.height+band_h),(255,255,255))
    new.paste(img.crop((0,0,img.width,insert_y)),(0,0))
    new.paste(img.crop((0,insert_y,img.width,img.height)),(0,insert_y+band_h))
    if top_band_from:
        y0,y1=top_band_from
        band=img.crop((0,y0,img.width,y1)).resize((img.width,band_h))
        new.paste(band,(0,insert_y))
    d=ImageDraw.Draw(new)
    # clear text area of the band (keep left/right borders)
    for (x,txt,col,w) in cells:
        pass
    return new,d
