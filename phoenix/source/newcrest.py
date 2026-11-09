# Rebuilds the Phoenix Fire overlay images from the user's supplied art:
#   source/crest-clean-src.jpg  -> crest cut-out (flat; the 3D comes from layering in phoenix3d.js)
#   source/app-icon-simple-src.jpg -> simple cartoonish iOS app icon used for apple-touch-icon and the web-app icons
# usage: python3 phoenix/source/newcrest.py   (run from the repo root)
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage as nd
S='phoenix/source/'; O='phoenix/overlay/'
im=Image.open(S+'crest-clean-src.jpg').convert('RGB'); a=np.asarray(im).astype(float)/255
mx=a.max(2); mn=a.min(2); sat=(mx-mn)/(mx+1e-6)
lab,n=nd.label((sat<0.10)&(mn>0.70)); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
fg=~np.isin(lab,list(border)); fg=nd.binary_opening(fg,iterations=2)
lab,n=nd.label(fg); sz=nd.sum(fg,lab,range(1,n+1)); fg=np.isin(lab,[i+1 for i,s in enumerate(sz) if s>400])
fg=nd.binary_erosion(nd.binary_fill_holes(fg),iterations=1)
r=im.convert('RGBA'); r.putalpha(Image.fromarray((fg*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.7))); r=r.crop(r.getbbox())
def w(width,name): r.resize((width,round(width*r.size[1]/r.size[0])),Image.LANCZOS).save(O+name)
w(700,'crest.png'); w(892,'crest-lg.png'); w(160,'crest-sm.png'); w(1024,'crest3d-tex.png')
# app icon: crop the iOS icon, round corners, flatten for iOS (it masks the shape itself)
src=Image.open(S+'app-icon-simple-src.jpg').convert('RGB'); ic=src.crop((190,76,940,826)); sz=ic.size[0]
mask=Image.new('L',(sz*4,sz*4),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,sz*4-1,sz*4-1),radius=int(sz*4*0.215),fill=255); mask=mask.resize((sz,sz),Image.LANCZOS)
rgba=ic.convert('RGBA'); rgba.putalpha(mask)
bg=(22,20,20)
def flat(px,pad=0.0):
    c=Image.new('RGB',(px,px),bg); k=round(px*(1-pad*2)); t=rgba.resize((k,k),Image.LANCZOS); c.paste(t,((px-k)//2,(px-k)//2),t); return c
k=round(sz*0.93); o=(sz-k)//2; ic.crop((o,o,o+k,o+k)).resize((180,180),Image.LANCZOS).save(O+'apple-touch-icon.png')  # full-bleed square, iOS rounds it itself

for px,name in ((192,'icon-192.png'),(512,'icon-512.png')): rgba.resize((px,px),Image.LANCZOS).save(O+name)
flat(512,0.10).save(O+'icon-maskable-512.png')
print('ok',r.size,bg)
