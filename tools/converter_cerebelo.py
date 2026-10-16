"""Converte a superfície pial do cerebelo (SUITPy, MIT, espaço MNI/FSL) num módulo JS compacto.
A "crista" de cada vértice vem da curvatura local (Laplaciano projetado na normal)."""
import base64, gzip, sys, zlib, math
import xml.etree.ElementTree as ET
from array import array

origem, destino = sys.argv[1], sys.argv[2]
bruto = open(origem, "rb").read()
if bruto[:2] == b"\x1f\x8b":
    bruto = gzip.decompress(bruto)
raiz = ET.fromstring(bruto)
pts = tri = None
for da in raiz.iter("DataArray"):
    enc, tipo, intent = da.get("Encoding"), da.get("DataType"), da.get("Intent")
    txt = da.find("Data").text.strip()
    cod = {"NIFTI_TYPE_FLOAT32": "f", "NIFTI_TYPE_INT32": "i"}[tipo]
    if enc == "ASCII":
        a = array(cod, [float(x) if cod == "f" else int(x) for x in txt.split()])
    else:
        d = base64.b64decode(txt)
        if enc == "GZipBase64Binary":
            d = zlib.decompress(d)
        a = array(cod)
        a.frombytes(d)
        if da.get("Endian") == "BigEndian":
            a.byteswap()
    if intent == "NIFTI_INTENT_POINTSET":
        pts = a
    elif intent == "NIFTI_INTENT_TRIANGLE":
        tri = a

n = len(pts) // 3
viz = [set() for _ in range(n)]
nor = [[0.0, 0.0, 0.0] for _ in range(n)]
P = lambda i: (pts[3 * i], pts[3 * i + 1], pts[3 * i + 2])
for t in range(len(tri) // 3):
    a, b, c = tri[3 * t], tri[3 * t + 1], tri[3 * t + 2]
    viz[a] |= {b, c}; viz[b] |= {a, c}; viz[c] |= {a, b}
    pa, pb, pc = P(a), P(b), P(c)
    u = [pb[k] - pa[k] for k in range(3)]
    v = [pc[k] - pa[k] for k in range(3)]
    cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    for i in (a, b, c):
        for k in range(3):
            nor[i][k] += cr[k]
conv = []
for i in range(n):
    p = P(i)
    m = [sum(pts[3 * j + k] for j in viz[i]) / max(1, len(viz[i])) for k in range(3)]
    nn = nor[i]
    L = math.sqrt(sum(x * x for x in nn)) or 1
    conv.append(sum((p[k] - m[k]) * nn[k] / L for k in range(3)))
# normaliza: + = crista (folha), - = fundo da fissura
srt = sorted(conv)
lim = max(abs(srt[int(0.03 * n)]), abs(srt[int(0.97 * n)])) or 1
s = array("b", [max(-127, min(127, round(-c / lim * 127))) for c in conv])  # mesmo sinal do "sulc": + = fundo
v = array("h", [round(x * 100) for x in pts])
f = array("H", tri)
xs, ys, zs = pts[0::3], pts[1::3], pts[2::3]
print("vertices", n, "faces", len(tri) // 3, "x", round(min(xs)), round(max(xs)), "y", round(min(ys)), round(max(ys)), "z", round(min(zs)), round(max(zs)))
b64 = lambda a: base64.b64encode(a.tobytes()).decode()
open(destino, "w", encoding="utf-8").write(
    "// Superfície pial do cerebelo (atlas SUIT, SUITPy — MIT, Diedrichsen Lab), espaço MNI (FSL).\n"
    "// Coordenadas em mm x 100 (Int16), faces Uint16, curvatura Int8 (+ = fundo da fissura).\n"
    f'export const cerebelo = {{ v: "{b64(v)}", f: "{b64(f)}", s: "{b64(s)}" }};\n'
)
print("ok", destino)
