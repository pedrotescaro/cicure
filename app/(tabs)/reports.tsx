import { useTabContentInset } from '../../src/ui/navigation/useTabContentInset';
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, FileCheck, UserCheck, Send } from 'lucide-react-native';
import { Card, Empty, IconButton, SectionTitle, Txt, s } from '../../src/ui/components';
import { colors as c, fonts } from '../../src/ui/theme';

export default function Reports() {
  const bottomInset = useTabContentInset();
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.content, 
          { paddingHorizontal: width < 380 ? 16 : 20, paddingBottom: bottomInset }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar Padronizada */}
        <View style={styles.topbar}>
          <Txt style={styles.brand}>cicure</Txt>
          <View style={s.row}>
            <IconButton 
              icon={FileText} 
              label="Novo relatório" 
              color={c.red} 
              onPress={() => router.push('/care/new')} 
            />
          </View>
        </View>

        {/* Título Padronizado */}
        <View style={{ gap: 2 }}>
          <Txt muted style={styles.sectionLabel}>DOCUMENTAÇÃO CLÍNICA</Txt>
          <Txt style={s.h1}>Relatórios</Txt>
        </View>

        {/* Card de Estado Vazio */}
        <Card style={styles.card}>
          <Empty 
            icon={FileText} 
            title="Seus relatórios aparecerão aqui" 
            description="Finalize um atendimento para gerar PDF completo, resumo para o paciente ou encaminhamento técnico com assinatura digital." 
            action="Iniciar atendimento" 
            onPress={() => router.push('/care/new')} 
          />
        </Card>

        {/* Formatos Disponíveis */}
        <View style={{ gap: 12 }}>
          <SectionTitle title="FORMATOS DISPONÍVEIS" />
          
          <Card style={styles.card}>
            <View style={styles.formatItem}>
              <View style={styles.iconCircle}>
                <FileCheck size={20} color={c.red} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt style={styles.formatTitle}>Relatório Clínico Completo</Txt>
                <Txt muted style={styles.formatDesc}>
                  Inclui identificação, mensuração digital, escalas aplicadas, produtos, terapias, fotos evolutivas e assinatura.
                </Txt>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.formatItem}>
              <View style={styles.iconCircle}>
                <UserCheck size={20} color={c.red} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt style={styles.formatTitle}>Resumo para o Paciente / Familiar</Txt>
                <Txt muted style={styles.formatDesc}>
                  Linguagem acessível, orientações de autocuidado sem jargões e pronto para compartilhamento via WhatsApp ou PDF.
                </Txt>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.formatItem}>
              <View style={styles.iconCircle}>
                <Send size={20} color={c.red} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt style={styles.formatTitle}>Encaminhamento Técnico Multidisciplinar</Txt>
                <Txt muted style={styles.formatDesc}>
                  Síntese clínica estruturada para continuidade de cuidado com médico cirurgião, angiologista ou nutricionista.
                </Txt>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingTop: 18, paddingBottom: 160, gap: 18 },
  topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: c.red, fontFamily: fonts.brand, fontSize: 26, letterSpacing: -0.8 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, fontFamily: fonts.semibold },
  card: { padding: 18, gap: 14 },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  formatTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: c.text,
  },
  formatDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
});
