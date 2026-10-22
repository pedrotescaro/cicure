import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { Badge, Empty, Field, IconButton, Txt, s } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { useStore } from '../../../data/store';
import type { ClinicalTemplate, TemplateType } from '../domain/types';

export function TemplatePickerModal({
  visible,
  type,
  onSelect,
  onClose
}: {
  visible: boolean;
  type?: TemplateType;
  onSelect: (template: ClinicalTemplate) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const templates = useStore(s => s.data.clinical_templates);
  const filtered = templates.filter(t => {
    if (t.deletedAt) return false;
    if (type && t.type !== type) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={s.between}>
            <View style={{ gap: 2 }}>
              <Txt style={styles.title}>Escolher modelo</Txt>
              <Txt muted style={{ fontSize: 12 }}>
                Revise o texto para este paciente antes de salvar.
              </Txt>
            </View>
            <IconButton icon={X} label="Fechar" onPress={onClose} />
          </View>

          {/* Busca */}
          <Field
            label="Buscar modelo"
            placeholder="Buscar modelo pelo nome..."
            value={search}
            onChangeText={setSearch}
          />

          {/* Lista */}
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {filtered.map(tmpl => (
              <Pressable
                key={tmpl.id}
                onPress={() => {
                  onSelect(tmpl);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.templateCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.85 }
                ]}
              >
                <View style={s.between}>
                  <Badge tone={tmpl.scope === 'organization' ? 'green' : 'neutral'}>
                    {tmpl.scope === 'organization' ? 'Clínica' : 'Pessoal'}
                  </Badge>
                  <Txt muted style={{ fontSize: 11 }}>{tmpl.createdBy}</Txt>
                </View>

                <Txt style={styles.templateName}>{tmpl.name}</Txt>
                <Txt muted style={{ fontSize: 13, lineHeight: 18 }}>{tmpl.description}</Txt>

                <View style={styles.cardFooter}>
                  <Sparkles size={14} color={colors.red} />
                  <Txt style={{ color: colors.red, fontSize: 12, fontFamily: fonts.semibold }}>
                    Toque para aplicar
                  </Txt>
                </View>
              </Pressable>
            ))}

            {filtered.length === 0 && (
              <Empty
                title="Nenhum modelo encontrado"
                description="Tente outro nome ou crie um modelo em Mais → Modelos de atendimento."
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: 20,
    gap: 14,
  },
  title: { fontFamily: fonts.brand, fontSize: 20 },
  list: { gap: 12, paddingBottom: 40 },
  templateCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  templateName: { fontFamily: fonts.semibold, fontSize: 15 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
});
