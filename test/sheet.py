import sys
from PIL import Image
prefix, n, cols, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
ims=[Image.open(f'{prefix}_{i}.png') for i in range(1,n+1)]
w,h=ims[0].size; rows=(n+cols-1)//cols
sheet=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): sheet.paste(im,((i%cols)*w,(i//cols)*h))
sheet.save(out); print(sheet.size)
