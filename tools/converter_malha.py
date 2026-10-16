"""Converte as superfícies GIFTI do fsaverage5 (nilearn, BSD-3) num módulo JS compacto."""
import base64, gzip, struct, sys, zlib
import xml.etree.ElementTree as ET
from array import array

origem, destino = sys.argv[1], sys.argv[2]


def arrays(caminho):
    raiz = ET.fromstring(gzip.open(caminho).read())
    out = []
    for da in raiz.iter("DataArray"):
        enc = da.get("Encoding")
        tipo = da.get("DataType")
        bruto = da.find("Data").text.strip()
        if enc == "GZipBase64Binary":
            dados = zlib.decompress(base64.b64decode(bruto))
        elif enc == "Base64Binary":
            dados = base64.b64decode(bruto)
        else:
            raise SystemExit("encoding não suportado: " + enc)
        cod = {"NIFTI_TYPE_FLOAT32": "f", "NIFTI_TYPE_INT32": "i"}[tipo]
        a = array(cod)
        a.frombytes(dados)
        if da.get("Endian") == "BigEndian":
            a.byteswap()
        out.append((da.get("Intent"), a))
    return out


def b64(a):
    return base64.b64encode(a.tobytes()).decode()


saida = ["// Malha cortical fsaverage5 (FreeSurfer), distribuída no pacote nilearn (BSD-3).",
         "// Coordenadas em mm x 100 (Int16), faces Uint16, profundidade dos sulcos Int8."]
for lado in ("left", "right"):
    pial = arrays(f"{origem}/pial_{lado}.gii.gz")
    pts = next(a for i, a in pial if i == "NIFTI_INTENT_POINTSET")
    tri = next(a for i, a in pial if i == "NIFTI_INTENT_TRIANGLE")
    sulc = arrays(f"{origem}/sulc_{lado}.gii.gz")[0][1]
    v = array("h", [round(x * 100) for x in pts])
    f = array("H", tri)
    m = max(abs(x) for x in sulc) or 1
    s = array("b", [max(-127, min(127, round(x / m * 127))) for x in sulc])
    xs, ys, zs = pts[0::3], pts[1::3], pts[2::3]
    print(lado, "vertices", len(pts) // 3, "faces", len(tri) // 3,
          "x", round(min(xs)), round(max(xs)), "y", round(min(ys)), round(max(ys)), "z", round(min(zs)), round(max(zs)))
    chave = "esq" if lado == "left" else "dir"
    saida.append(f'export const {chave} = {{ v: "{b64(v)}", f: "{b64(f)}", s: "{b64(s)}" }};')

open(destino, "w", encoding="utf-8").write("\n".join(saida) + "\n")
print("ok", destino)
