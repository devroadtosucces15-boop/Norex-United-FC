import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi
from scipy.spatial import ConvexHull
src='/tmp/claude-1000/-home-mrsuccess-NOREX-UNITED/b9bbdd66-9169-4916-92bf-269c337eadcc/images/1.webp'
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(float); lum=a.mean(2); H,W=lum.shape
base=ndi.binary_fill_holes(ndi.binary_closing(ndi.binary_opening(lum>62,np.ones((3,3)),iterations=4),np.ones((3,3)),iterations=6))
lab,n=ndi.label(base); sizes=ndi.sum(base,lab,range(1,n+1)); main=lab==(1+int(np.argmax(sizes)))
def hullmask(pts):
    h=ConvexHull(pts); poly=[tuple(pts[i]) for i in h.vertices]; m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255); return np.asarray(m)>0
m2=ndi.binary_fill_holes(ndi.binary_closing(ndi.binary_opening(lum>40,np.ones((3,3)),iterations=3),np.ones((3,3)),iterations=6))
l2,n2=ndi.label(m2); s2=ndi.sum(m2,l2,range(1,n2+1)); big=l2==(1+int(np.argmax(s2)))
L=np.full(H,np.nan); R=np.full(H,np.nan)
for y in range(H):
    xs_=np.nonzero(big[y])[0]
    if len(xs_)>40 and y>=95: L[y]=xs_.min(); R[y]=xs_.max()
idx=np.arange(H); ok=~np.isnan(L); L=np.interp(idx,idx[ok],L[ok]); R=np.interp(idx,idx[ok],R[ok])
from scipy.signal import medfilt
L=medfilt(L,21); R=medfilt(R,21)
y0=int(idx[ok].min()); y1=int(idx[ok].max())
pm=Image.new('L',(W,H),0); d=ImageDraw.Draw(pm)
d.polygon([(L[y],y) for y in range(y0,y1+1)]+[(R[y],y) for y in range(y1,y0-1,-1)],fill=255)
mask=np.asarray(pm)>0
mask[470:]=False
bn=ndi.binary_fill_holes(ndi.binary_closing(big,structure=np.ones((1,41)),iterations=1)); bn=ndi.binary_fill_holes(ndi.binary_closing(bn,structure=np.ones((9,9))))
mask[470:]=bn[470:]
# stars: region above the shield, lower threshold, no opening
st=np.zeros_like(mask); reg=np.zeros_like(mask); reg[:150,:]=True
s=ndi.binary_fill_holes(ndi.binary_closing((lum>38)&reg,np.ones((3,3)),iterations=3))
sl,sn=ndi.label(s); ss=ndi.sum(s,sl,range(1,sn+1))
for i,v in enumerate(ss,1):
    if 2000<v<4200: st|=sl==i
print('stars',sum(1 for v in ss if v>700), sorted(ss)[-8:])
st=ndi.binary_opening(st,structure=np.ones((3,3)),iterations=5); st=ndi.binary_dilation(st,iterations=1)
mask|=st
mask=ndi.binary_erosion(mask,iterations=2)
m=Image.fromarray((mask*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.1))
out=im.convert('RGBA'); out.putalpha(m)
bb=out.getbbox(); out=out.crop(bb); out.save('badge_cut.png'); print(out.size)
bg=Image.new('RGB',out.size,(255,0,255)); bg.paste(out,mask=out.split()[3]); bg.save('preview.png')
