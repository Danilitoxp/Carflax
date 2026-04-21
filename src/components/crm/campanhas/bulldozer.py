
import os

path = r'src/components/crm/campanhas/CampanhasView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Localizamos a linha 461 (índice 460)
# Vamos verificar se ela contém o ChevronRight
if '<ChevronRight' in lines[460] and '</button>' not in lines[461]:
    lines.insert(461, '                </button>\n')
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Bulldozer: Tag injetada na linha 461!")
else:
    print(f"Bulldozer: Falha ao localizar o ponto exato. Conteúdo da linha 461: {lines[460].strip()}")
