import bpy, bmesh, numpy as np, os
bpy.ops.wm.read_factory_settings(use_empty=True)
D=os.environ['BD']; tex=os.path.join(D,'tex1024.png')
img=bpy.data.images.load(tex); W,H=img.size
px=np.array(img.pixels[:]).reshape(H,W,4)[::-1]   # top-first rows
al=px[...,3]; lum=px[...,:3].mean(2)
# relief: rounded rim from distance-to-edge, plus a hint of the artwork's own light/dark
m=al>0.5; rel=np.load(os.path.join(D,'rel.npy')); dil=np.load(os.path.join(D,'dil.npy'))
nx,ny=int(os.environ.get('NX',130)),int(os.environ.get('NY',136))
xs=np.linspace(0,W-1,nx).astype(int); ys=np.linspace(0,H-1,ny).astype(int)
asp=H/W; sx=1.0; sy=asp
bm=bmesh.new(); uv=bm.loops.layers.uv.new()
vf={}; vb={}
def vert(store,i,j,z):
    k=(i,j)
    if k not in store:
        store[k]=bm.verts.new(((xs[i]/(W-1)-.5)*sx,-z,(.5-ys[j]/(H-1))*sy))
    return store[k]
T=0.045
for j in range(ny-1):
    for i in range(nx-1):
        if not dil[ys[j]:ys[j+1]+1, xs[i]:xs[i+1]+1].any(): continue
        c=[(i,j),(i+1,j),(i+1,j+1),(i,j+1)]
        f=bm.faces.new([vert(vf,a,b,rel[ys[b],xs[a]]*0.05+0.0) for a,b in c])
        for l,(a,b) in zip(f.loops,c): l[uv].uv=(xs[a]/(W-1),1-ys[b]/(H-1))
        g=bm.faces.new([vert(vb,a,b,-T-rel[ys[b],xs[a]]*0.02) for a,b in reversed(c)])
        for l,(a,b) in zip(g.loops,reversed(c)): l[uv].uv=(xs[a]/(W-1),1-ys[b]/(H-1))
bm.normal_update()
me=bpy.data.meshes.new('PhoenixCrest'); bm.to_mesh(me); bm.free()
ob=bpy.data.objects.new('PhoenixCrest',me); bpy.context.scene.collection.objects.link(ob)
for p in me.polygons: p.use_smooth=True
mat=bpy.data.materials.new('BadgeMetal'); mat.use_nodes=True; nt=mat.node_tree; nt.nodes.clear()
out=nt.nodes.new('ShaderNodeOutputMaterial'); pr=nt.nodes.new('ShaderNodeBsdfPrincipled'); t=nt.nodes.new('ShaderNodeTexImage'); t.image=img
img.alpha_mode='STRAIGHT'
nt.links.new(t.outputs['Color'],pr.inputs['Base Color']); nt.links.new(t.outputs['Alpha'],pr.inputs['Alpha'])
pr.inputs['Metallic'].default_value=0.85; pr.inputs['Roughness'].default_value=0.32
nt.links.new(pr.outputs['BSDF'],out.inputs['Surface'])
try: mat.blend_method='CLIP'
except Exception: pass
me.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(D,'phoenix_crest.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(D,'phoenix_crest.glb'),export_format='GLB',use_selection=False,export_image_format='AUTO')
print('verts',len(me.vertices),'faces',len(me.polygons))

# raw mesh for the site (three.js coords: x, z, -y): header [verts, tris], positions f32x3, uv f32x2, indices u32x3
import struct
P=np.zeros((len(me.vertices),3),np.float32); U=np.zeros((len(me.vertices),2),np.float32)
for v in me.vertices: P[v.index]=(v.co.x,v.co.z,-v.co.y)
uvl=me.uv_layers.active.data
for lp in me.loops: U[lp.vertex_index]=uvl[lp.index].uv
tris=[]
for p in me.polygons:
    a=list(p.vertices); tris+= [(a[0],a[1],a[2]),(a[0],a[2],a[3])]
I=np.array(tris,np.uint32)
with open(os.path.join(D,'crest_mesh.bin'),'wb') as f: f.write(struct.pack('<II',len(P),len(I))); f.write(P.tobytes()); f.write(U.tobytes()); f.write(I.tobytes())
print('bin',len(P),len(I),'bbox',P.min(0),P.max(0))
