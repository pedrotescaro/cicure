import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck, Check, X, ShieldAlert, History } from 'lucide-react-native';
import { useStore, uid } from '../../../data/store';
import { Badge, Button, Card, Empty, IconButton, Label, SectionTitle, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { CONSENT_DEFINITIONS, type ConsentType, type PatientConsent } from '../domain/types';

export default function ConsentCenterScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const patient = useStore(st => st.data.patients.find(p => p.id === patientId));

  const [consents, setConsents] = useState<PatientConsent[]>(() => {
    return CONSENT_DEFINITIONS.map(def => ({
      id: `consent-${def.type}`,
      patientId,
      type: def.type,
      title: def.title,
      description: def.description,
      status: (def.type === 'atendimento' || def.type === 'registro_fotografico' ? 'ativo' : 'revogado') as 'ativo' | 'revogado',
      termVersion: 'v2026.1',
      signedAt: '2026-02-14',
      professionalName: 'Caroline Ferreira'
    }));
  });

  if (!patient) {
    return (
      <View style={styles.center}>
        <Empty title="Paciente não encontrado" description="Volte para a lista." action="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const handleToggleConsent = (item: PatientConsent) => {
    if (item.status === 'ativo') {
      Alert.alert(
        'Revogar Consentimento',
        `Deseja revogar a autorização para "${item.title}"?\n\nO histórico da revogação será preservado no prontuário de acordo com a LGPD.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar Revogação',
            style: 'destructive',
            onPress: () => {
              setConsents(prev => prev.map(c => c.id === item.id ? {
                ...c,
                status: 'revogado',
                revokedAt: new Date().toISOString().slice(0, 10),
                revocationReason: 'Revogação voluntária solicitada pelo paciente.'
              } : c));
              Alert.alert('Consentimento Revogado', 'A alteração foi registrada na trilha de auditoria.');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Coletar Consentimento',
        `Confirmar autorização formal para "${item.title}" sob a versão do termo ${item.termVersion}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Autorizar com Assinatura',
            onPress: () => {
              setConsents(prev => prev.map(c => c.id === item.id ? {
                ...c,
                status: 'ativo',
                signedAt: new Date().toISOString().slice(0, 10),
                revokedAt: undefined,
                revocationReason: undefined
              } : c));
              Alert.alert('Consentimento Ativado', 'A autorização granular está em vigor.');
            }
          }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.headerTitle}>Termos de Consentimento</Txt>
          <Txt muted style={{ fontSize: 13 }}>{patient.name} · Autorizações Granulares LGPD</Txt>
        </View>
      </View>

      <FlatList
        data={consents}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Card style={{ backgroundColor: '#FAFAFA', gap: 6, marginBottom: 12 }}>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Consentimento Não Cumulativo</Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
              Cada finalidade é tratada de forma estritamente independente. A autorização para atendimento não concede autorização automática para compartilhamento, ensino ou pesquisa.
            </Txt>
          </Card>
        }
        renderItem={({ item }) => {
          const isActive = item.status === 'ativo';

          return (
            <Card style={[styles.consentCard, isActive ? styles.cardActive : styles.cardRevoked]}>
              <View style={s.between}>
                <View style={s.row}>
                  {isActive ? (
                    <ShieldCheck size={22} color={c.green} />
                  ) : (
                    <ShieldAlert size={22} color={c.secondary} />
                  )}
                  <Txt style={[styles.consentTitle, { flex: 1 }]}>{item.title}</Txt>
                </View>
                <Badge tone={isActive ? 'green' : 'neutral'}>
                  {isActive ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}
                </Badge>
              </View>

              <Txt muted style={{ fontSize: 13, lineHeight: 18 }}>{item.description}</Txt>

              <View style={styles.cardFooter}>
                <View style={{ gap: 2 }}>
                  <Txt muted style={{ fontSize: 11 }}>Termo: {item.termVersion} · Responsável: {item.professionalName}</Txt>
                  {isActive ? (
                    <Txt style={{ fontSize: 11, color: c.green, fontFamily: fonts.medium }}>
                      Assinado e em vigor desde {item.signedAt}
                    </Txt>
                  ) : item.revokedAt ? (
                    <Txt style={{ fontSize: 11, color: c.red }}>
                      Revogado em {item.revokedAt} ({item.revocationReason})
                    </Txt>
                  ) : (
                    <Txt muted style={{ fontSize: 11 }}>Pendente de manifestação do paciente</Txt>
                  )}
                </View>

                <Button 
                  title={isActive ? 'Revogar' : 'Autorizar'} 
                  variant={isActive ? 'outline' : 'primary'} 
                  small 
                  onPress={() => handleToggleConsent(item)} 
                />
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { fontFamily: fonts.brand, fontSize: 22, color: c.text },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  consentCard: { gap: 10, marginBottom: 8 },
  cardActive: { borderColor: '#C8E6C9' },
  cardRevoked: { borderColor: c.border },
  consentTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 10,
  }
});
