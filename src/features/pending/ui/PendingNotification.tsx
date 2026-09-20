import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  AlertCircle, 
  Bell, 
  ChevronRight, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Cloud 
} from 'lucide-react-native';
import { Badge, Button, Card, Divider, IconButton, Label, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import type { PendingItem } from '../domain/pending.service';

type Props = {
  items: PendingItem[];
};

export function PendingNotification({ items }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [modalVisible, setModalVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (items.length === 0 || dismissed) {
    return null;
  }

  const handleOpenItem = (route: string) => {
    setModalVisible(false);
    router.push(route as never);
  };

  const handleOpenFullCenter = () => {
    setModalVisible(false);
    router.push('/pending' as never);
  };

  const highPriorityCount = items.filter(i => i.severity === 'alta').length;

  return (
    <>
      {/* Notificação Compacta (Estilo Toast / Banner Notificação) */}
      <View style={styles.notificationWrapper}>
        <Pressable 
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.notificationPill,
            pressed && { opacity: 0.85 }
          ]}
        >
          <View style={styles.bellWrap}>
            <Bell size={15} color={c.red} />
            <View style={styles.pulseDot} />
          </View>

          <View style={styles.textWrap}>
            <Txt style={styles.notificationTitle} numberOfLines={1}>
              {items.length === 1 
                ? '1 pendência clínica aguardando' 
                : `${items.length} pendências clínicas aguardando`}
            </Txt>
            {highPriorityCount > 0 ? (
              <Txt style={styles.notificationSubtitle} numberOfLines={1}>
                {highPriorityCount === 1 ? '1 urgente' : `${highPriorityCount} urgentes`}
              </Txt>
            ) : null}
          </View>

          <View style={styles.actionChip}>
            <Txt style={styles.actionText}>Ver</Txt>
            <ChevronRight size={14} color={c.red} />
          </View>

          <Pressable 
            hitSlop={8} 
            onPress={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            style={styles.closeButton}
          >
            <X size={14} color={c.secondary} />
          </Pressable>
        </Pressable>
      </View>

      {/* Popup / Modal de Pendências */}
      <Modal 
        visible={modalVisible} 
        animationType="fade" 
        transparent 
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          
          <View style={[styles.popupCard, { maxWidth: Math.min(width - 32, 460) }]}>
            {/* Header do Popup */}
            <View style={styles.popupHeader}>
              <View style={s.row}>
                <View style={styles.popupIconCircle}>
                  <AlertCircle size={20} color={c.red} />
                </View>
                <View style={{ gap: 1 }}>
                  <View style={s.row}>
                    <Txt style={styles.popupTitle}>Pendências Clínicas</Txt>
                    <Badge tone="red">{items.length}</Badge>
                  </View>
                  <Txt muted style={{ fontSize: 12 }}>
                    Ações recomendadas para seus atendimentos
                  </Txt>
                </View>
              </View>
              <IconButton icon={X} label="Fechar" onPress={() => setModalVisible(false)} />
            </View>

            {/* Lista de Itens no Popup */}
            <ScrollView 
              style={{ maxHeight: 320 }}
              contentContainerStyle={styles.popupList}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => {
                const isHigh = item.severity === 'alta';
                return (
                  <Pressable 
                    key={item.id}
                    onPress={() => handleOpenItem(item.route)}
                    style={({ pressed }) => [
                      styles.itemRow,
                      isHigh && styles.highPriorityRow,
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={s.row}>
                        <Txt style={styles.itemTitle} numberOfLines={1}>{item.title}</Txt>
                        <Badge tone={isHigh ? 'red' : item.severity === 'media' ? 'amber' : 'neutral'}>
                          {item.severity === 'alta' ? 'Urgente' : item.severity === 'media' ? 'Atenção' : 'Info'}
                        </Badge>
                      </View>
                      <Txt muted style={{ fontSize: 12 }} numberOfLines={2}>
                        {item.description}
                      </Txt>
                    </View>
                    <ChevronRight size={18} color={c.secondary} />
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Rodapé com Botão para Central Completa */}
            <View style={styles.popupFooter}>
              <Button 
                title="Abrir Central Completa" 
                variant="primary" 
                icon={ExternalLink} 
                small 
                onPress={handleOpenFullCenter} 
              />
              <Button 
                title="Fechar" 
                variant="outline" 
                small 
                onPress={() => setModalVisible(false)} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  notificationWrapper: {
    marginVertical: 4,
  },
  notificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#D62828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bellWrap: {
    position: 'relative',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.red,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  notificationTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: c.text,
  },
  notificationSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: c.red,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: c.red,
  },
  closeButton: {
    padding: 4,
    marginLeft: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  popupCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  popupIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: {
    fontFamily: fonts.brand,
    fontSize: 17,
    color: c.text,
  },
  popupList: {
    gap: 8,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  highPriorityRow: {
    backgroundColor: '#FFFDFD',
    borderColor: '#FECACA',
  },
  itemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: c.text,
    flex: 1,
  },
  popupFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
  }
});
