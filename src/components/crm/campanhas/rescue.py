
import os

path = r'src/components/crm/campanhas/CampanhasView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if '<ChevronRight className="w-5 h-5" />' in line and '</button>' not in line:
        if 'isPremioModalOpen' in ''.join(lines[lines.index(line)-20:lines.index(line)]):
             new_lines.append('                </button>\n')

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Resgatado com sucesso!")
