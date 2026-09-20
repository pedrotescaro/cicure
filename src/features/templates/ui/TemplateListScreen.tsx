import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Plus, 
  Bookmark, 
  Copy, 
  Trash2, 
  Sparkles, 
  X, 
  Check 
} from 'lucide-react-native';
import { Badge, Button, Card, Choices, Empty, Field, IconButton, Label, Pills, SectionTitle, Txt, s } from '../../../ui/components';
import { colors as c, fonts, useTheme } from '../../../ui/theme';
import { DEFAULT_TEMPLATES, createTemplate, duplicateTemplate } from '../domain/template.service';
import type { ClinicalTemplate, TemplateType } from '../domain/types';

const TYPE_PILLS = [
  'Todos',
  'Curativos',
  'Fotobiomodulação',
  'Orientações',
  'Condutas',
  'Prescrições'
];

const PILL_TYPE_MAP: Record<string, TemplateType | 'todos'> = {
  'Todos': 'todos',
  'Curativos': 'curativo',
  'Fotobiomodulação': 'fotobiomodulacao',
  'Orientações': 'orientacoes',
  'Condutas': 'conduta',
  'Prescrições': 'prescricao'
};

export default function TemplateListScreen() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const [templates, setTemplates] = useState<ClinicalTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedPill, setSelectedPill] = useState('Todos');
  const [scopeFilter, setScopeFilter] = useState<'todos' | 'personal' | 'organization'>('todos');
  const [modalVisible, setModalVisible] = useState(false);

  // Form states do novo template
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TemplateType>('curativo');
  const [newDesc, setNewDesc] = useState('');
  const [newContentText, setNewContentText] = useState('');
  const [newScope, setNewScope] = useState<'personal' | 'organization'>('personal');

  const filtered = templates.filter(t => {
    const typeFilter = PILL_TYPE_MAP[selectedPill] || 'todos';
    if (typeFilter !== 'todos' && t.type !== typeFilter) return false;
    if (scopeFilter !== 'todos' && t.scope !== scopeFilter) return false;
    return true;
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      Alert.alert('Atenção', 'Informe o nome do template.');
      return;
    }
    const created = createTemplate({
      name: newName.trim(),
      type: newType,
      description: newDesc.trim(),
      content: { text: newContentText.trim() },
      scope: newScope,
      createdBy: 'Você'
    });

    setTemplates(prev => [created, ...prev]);
    setModalVisible(false);
    setNewName('');
    setNewDesc('');
    setNewContentText('');
    Alert.alert('Sucesso', 'Template clínico criado com sucesso!');
  };

  const handleDuplicate = (tpl: ClinicalTemplate) => {
    const dup = duplicateTemplate(tpl);
    setTemplates(prev => [dup, ...prev]);
    Alert.alert('Duplicado', `Cópia de "${tpl.name}" foi adicionada aos seus templates.`);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Excluir Template',
      'Tem certeza de que deseja remover este modelo clínico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: () => {
            setTemplates(prev => prev.filter(t => t.id !== id));
          } 
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Biblioteca de Modelos</Txt>
          <Txt muted style={{ fontSize: 13 }}>Protocolos padronizados de curativos e condutas</Txt>
        </View>
        <IconButton icon={Plus} label="Novo" onPress={() => setModalVisible(true)} />
      </View>

      {/* Filtros em Pills */}
      <View style={[styles.filterBar, { borderBottomColor: c.border }]}>
        <Pills 
          options={TYPE_PILLS} 
          value={selectedPill} 
          onChange={setSelectedPill} 
        />
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={styles.templateCard}>
            <View style={s.between}>
              <Badge tone="green">{item.type.toUpperCase()}</Badge>
              <View style={s.row}>
                <IconButton 
                  icon={Copy} 
                  label="Duplicar" 
                  onPress={() => handleDuplicate(item)} 
                  style={{ width: 36, height: 36 }}
                />
                <IconButton 
                  icon={Trash2} 
                  label="Excluir" 
                  color={c.red} 
                  onPress={() => handleDelete(item.id)} 
                  style={{ width: 36, height: 36 }}
                />
              </View>
            </View>

            <Txt style={styles.cardName}>{item.name}</Txt>
            <Txt muted style={{ fontSize: 13, lineHeight: 18 }}>{item.description}</Txt>

            <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
              <Txt muted style={{ fontSize: 11 }}>Autor: {item.createdBy}</Txt>
              <Txt muted style={{ fontSize: 11 }}>Atualizado em {item.updatedAt.slice(0, 10)}</Txt>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Empty 
            title="Nenhum template encontrado" 
            description="Crie modelos de curativos, orientações e condutas para poupar tempo no atendimento."
            action="Criar Template"
            onPress={() => setModalVisible(true)}
          />
        }
      />

      {/* Modal Criar Template */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={s.between}>
              <Txt style={{ fontFamily: fonts.brand, fontSize: 20 }}>Novo Template Clínico</Txt>
              <IconButton icon={X} label="Fechar" onPress={() => setModalVisible(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <Field 
                label="Nome do Template" 
                placeholder="Ex.: Curativo Padrão Úlcera Venosa Exsudativa" 
                value={newName} 
                onChangeText={setNewName} 
              />

              <View style={{ gap: 6 }}>
                <Label>Tipo de Template</Label>
                <Choices 
                  options={['curativo', 'fotobiomodulacao', 'orientacoes', 'conduta', 'prescricao']} 
                  value={newType} 
                  onChange={v => setNewType(v as TemplateType)} 
                />
              </View>

              <Field 
                label="Descrição / Indicação Clínica" 
                placeholder="Ex.: Para pacientes com alto exsudato serossanguinolento..." 
                value={newDesc} 
                onChangeText={setNewDesc} 
              />

              <Field 
                label="Conteúdo / Conduta / Orientações" 
                multiline 
                placeholder="Descreva a sequência de produtos, orientações e parâmetros..." 
                value={newContentText} 
                onChangeText={setNewContentText} 
              />

              <View style={{ gap: 6 }}>
                <Label>Visibilidade / Compartilhamento</Label>
                <Choices 
                  options={['Uso pessoal', 'Compartilhar com a clínica']} 
                  value={newScope === 'personal' ? 'Uso pessoal' : 'Compartilhar com a clínica'} 
                  onChange={v => setNewScope(v === 'Uso pessoal' ? 'personal' : 'organization')} 
                />
              </View>

              <Button 
                title="Salvar Template" 
                icon={Check} 
                onPress={handleCreate} 
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22 },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  listContent: { padding: 16, gap: 14, paddingBottom: 100 },
  templateCard: { gap: 10 },
  cardName: { fontFamily: fonts.semibold, fontSize: 16 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
    gap: 16,
  },
});
