import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
U='/home/mrsuccess/.claude/uploads/3c412429-c0ba-4bfd-bfe5-e2b5ae836b73/'
im=Image.open(U+'a9cbb330-image.jpg').convert('RGB'); a=np.asarray(im).astype(float)
h,w,_=a.shape
yy,xx=np.mgrid[0:h,0:w]; ring=np.zeros((h,w),bool); ring[:40]=ring[-40:]=ring[:,:40]=ring[:,-40:]=True
A=np.stack([np.ones(h*w),xx.ravel(),yy.ravel(),xx.ravel()**2,yy.ravel()**2,(xx*yy).ravel()],1)
m=ring.ravel(); bg=np.zeros_like(a)
for c in range(3):
    co=np.linalg.lstsq(A[m],a[...,c].ravel()[m],rcond=None)[0]; bg[...,c]=(A@co).reshape(h,w)
d=np.abs(a-bg).max(2)
fg=d>20
fg=nd.binary_opening(fg,iterations=1)
lab,n=nd.label(fg); sizes=nd.sum(fg,lab,range(1,n+1)); big=np.argmax(sizes)+1
# keep stars (separate blobs) too: keep components >300px
keep=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>300])
keep=nd.binary_fill_holes(keep)
keep=nd.binary_erosion(keep,iterations=1)
al=Image.fromarray((keep*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
rgba=im.copy(); rgba.putalpha(al)
bb=rgba.getbbox(); print(bb, n)
rgba=rgba.crop(bb); rgba.save('assets/crest.png'); print(rgba.size)
# preview on dark
bgp=Image.new('RGBA',rgba.size,(20,8,10,255)); bgp.alpha_composite(rgba); bgp.save('/tmp/claude-1000/-home-mrsuccess-NOREX-UNITED/3c412429-c0ba-4bfd-bfe5-e2b5ae836b73/scratchpad/crestchk.png')
