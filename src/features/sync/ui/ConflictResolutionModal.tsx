import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { AlertTriangle, Check, Layers, X, ShieldAlert } from 'lucide-react-native';
import { Badge, Button, Card, IconButton, Label, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import type { ConflictResolution, SyncItem } from '../domain/types';

export function ConflictResolutionModal({
  item,
  visible,
  onResolve,
  onClose
}: {
  item?: SyncItem;
  visible: boolean;
  onResolve: (res: ConflictResolution) => void;
  onClose: () => void;
}) {
  if (!item || !item.localData || !item.remoteData) return null;

  const handleChoose = (type: 'use_local' | 'use_remote' | 'reconciled') => {
    onResolve({
      syncItemId: item.id,
      resolutionType: type,
      reconciledPayload: type === 'use_local' ? item.localData : item.remoteData,
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'Profissional autenticado'
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={s.between}>
            <View style={s.row}>
              <AlertTriangle size={22} color={c.amber} />
              <View>
                <Txt style={styles.title}>Conflito de Versões</Txt>
                <Txt muted style={{ fontSize: 12 }}>Edição simultânea detectada em dois aparelhos</Txt>
              </View>
            </View>
            <IconButton icon={X} label="Fechar" onPress={onClose} />
          </View>

          <Card style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', gap: 6 }}>
            <Txt style={{ fontFamily: fonts.semibold, color: c.amber, fontSize: 13 }}>
              Decisão Clínica Necessária
            </Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 17 }}>
              Para preservar a segurança do prontuário, o Cicure não descarta nenhuma alteração silenciosamente. Compare as versões e escolha qual manter.
            </Txt>
          </Card>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {/* Versão Local (Deste Aparelho) */}
            <Card style={styles.versionCard}>
              <View style={s.between}>
                <Txt style={styles.versionTitle}>Versão Local (Deste Aparelho)</Txt>
                <Badge tone="neutral">Local</Badge>
              </View>
              <View style={styles.dataBox}>
                <Txt style={{ fontSize: 13 }}>• Medida: {item.localData.medida}</Txt>
                <Txt style={{ fontSize: 13 }}>• Tecido: {item.localData.tecido}</Txt>
                <Txt style={{ fontSize: 13 }}>• Cobertura: {item.localData.cobertura}</Txt>
                <Txt muted style={{ fontSize: 12, fontStyle: 'italic' }}>"{item.localData.observacao}"</Txt>
              </View>
              <Button 
                title="Manter Versão Local" 
                variant="outline" 
                small 
                onPress={() => handleChoose('use_local')} 
              />
            </Card>

            {/* Versão Remota (Servidor / Outro Aparelho) */}
            <Card style={styles.versionCard}>
              <View style={s.between}>
                <Txt style={styles.versionTitle}>Versão Remota (Servidor / Outro Dispositivo)</Txt>
                <Badge tone="neutral">Servidor</Badge>
              </View>
              <View style={styles.dataBox}>
                <Txt style={{ fontSize: 13 }}>• Medida: {item.remoteData.medida}</Txt>
                <Txt style={{ fontSize: 13 }}>• Tecido: {item.remoteData.tecido}</Txt>
                <Txt style={{ fontSize: 13 }}>• Cobertura: {item.remoteData.cobertura}</Txt>
                <Txt muted style={{ fontSize: 12, fontStyle: 'italic' }}>"{item.remoteData.observacao}"</Txt>
              </View>
              <Button 
                title="Aceitar Versão do Servidor" 
                variant="dark" 
                small 
                onPress={() => handleChoose('use_remote')} 
              />
            </Card>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
    gap: 14,
  },
  title: { fontFamily: fonts.brand, fontSize: 20 },
  versionCard: { gap: 10, borderColor: c.border },
  versionTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  dataBox: { backgroundColor: '#FAFAFA', padding: 10, borderRadius: 10, gap: 4 },
});
