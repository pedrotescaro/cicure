import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useStore } from '../../../data/store';
import { Badge, Button, Card, Choices, Empty, Field, Txt } from '../../../ui/components';
import { SupportMessage, SupportPage, supportStyles as s } from '../../support/ui/SupportPage';
import { createTemplate, duplicateTemplate } from '../domain/template.service';
import { TEMPLATE_TYPE_LABELS, type ClinicalTemplate, type TemplateType } from '../domain/types';

const types: TemplateType[] = ['orientacoes', 'conduta', 'curativo', 'prescricao'];
export default function TemplateListScreen() {
  const store = useStore();
  const [editing, setEditing] = useState<ClinicalTemplate | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TemplateType>('orientacoes');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const templates = store.data.clinical_templates.filter(t => !t.deletedAt && t.scope === 'personal');
  const openEditor = (template: ClinicalTemplate | 'new') => {
    setEditing(template); setError(''); setNotice('');
    setName(template === 'new' ? '' : template.name); setDescription(template === 'new' ? '' : template.description);
    setType(template === 'new' ? 'orientacoes' : template.type);
    setText(template === 'new' ? '' : String(template.content.text || template.content.guidance || template.content.plan || template.content.observations || ''));
  };
  const save = async () => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const content = { text: text.trim(), ...(type === 'orientacoes' ? { guidance: text.trim() } : type === 'conduta' ? { plan: text.trim() } : { observations: text.trim() }) };
      const created = createTemplate({ name, type, description, content, createdBy: store.authUserId || '' });
      await store.save('clinical_templates', editing && editing !== 'new' ? { ...editing, name: created.name, type, description: created.description, content, updatedAt: created.updatedAt } : created);
      setEditing(null); setNotice('Modelo salvo. Ao aplicar, revise o conteúdo para cada paciente.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Modelo não salvo. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const duplicate = async (template: ClinicalTemplate) => {
    try { await store.save('clinical_templates', duplicateTemplate(template, store.authUserId || '')); setNotice('Cópia salva na sua lista.'); }
    catch { setError('Não foi possível duplicar o modelo. Tente novamente.'); }
  };
  const remove = (template: ClinicalTemplate) => Alert.alert('Excluir modelo?', 'O modelo deixará de aparecer para novos atendimentos. Registros já salvos serão preservados.', [
    { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir modelo', style: 'destructive', onPress: () => { void store.save('clinical_templates', { ...template, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).catch(() => setError('Modelo não excluído. Tente novamente.')); } },
  ]);
  return <SupportPage title="Modelos de atendimento" subtitle="Guarde textos que você costuma usar. Todo conteúdo é escrito e revisado por você.">
    <Button title={editing ? 'Fechar edição' : 'Criar modelo'} variant="outline" onPress={() => editing ? setEditing(null) : openEditor('new')} />
    <SupportMessage error>{error}</SupportMessage><SupportMessage>{notice}</SupportMessage>
    {!!editing && <View style={s.section}>
      <Txt style={s.heading}>{editing === 'new' ? 'Novo modelo pessoal' : 'Editar modelo'}</Txt>
      <Field label="Nome do modelo *" value={name} onChangeText={setName} placeholder="Ex.: Orientações após a consulta" />
      <Txt>Onde você pretende usar?</Txt><Choices options={types.map(t => TEMPLATE_TYPE_LABELS[t])} value={TEMPLATE_TYPE_LABELS[type]} onChange={v => setType(types.find(t => TEMPLATE_TYPE_LABELS[t] === v)!)} />
      <Field label="Descrição" value={description} onChangeText={setDescription} />
      <Field label="Texto do modelo *" value={text} onChangeText={setText} multiline />
      <Button title="Salvar modelo" loading={busy} onPress={() => void save()} />
    </View>}
    <Field label="Buscar nos seus modelos" value={search} onChangeText={setSearch} placeholder="Digite o nome do modelo" />
    {templates.filter(t => t.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(template => <Card key={template.id} style={{ borderRadius: 16 }}>
      <Badge>{TEMPLATE_TYPE_LABELS[template.type]}</Badge><Txt style={s.heading}>{template.name}</Txt>{!!template.description && <Txt muted>{template.description}</Txt>}
      <Txt style={s.body}>{String(template.content.text || template.content.guidance || template.content.plan || template.content.observations || 'Modelo estruturado salvo na prescrição.')}</Txt>
      <Txt muted>Atualizado em {new Date(template.updatedAt).toLocaleDateString('pt-BR')}</Txt>
      <Button title={`Editar ${template.name}`} variant="outline" onPress={() => openEditor(template)} /><Button title="Criar uma cópia" variant="ghost" onPress={() => void duplicate(template)} /><Button title="Excluir modelo" variant="ghost" onPress={() => remove(template)} />
    </Card>)}
    {!templates.length && !editing && <Empty title="Seus textos, sempre à mão" description="Crie seu primeiro modelo. Você poderá aplicá-lo e revisar durante o atendimento." action="Criar primeiro modelo" onPress={() => openEditor('new')} />}
    {!!templates.length && !templates.some(t => t.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) && <Txt muted>Nenhum modelo com esse nome. Tente outra busca.</Txt>}
  </SupportPage>;
}
