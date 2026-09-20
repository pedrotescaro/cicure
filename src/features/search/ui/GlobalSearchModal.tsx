import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, X, User, HeartPulse, Stethoscope, FileText, Package } from 'lucide-react-native';
import { Badge, Card, Empty, Field, IconButton, Txt, s } from '../../../ui/components';
import { colors as c, fonts } from '../../../ui/theme';
import { useStore } from '../../../data/store';

export function GlobalSearchModal({
  visible,
  onClose
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { patients, wounds, visits, reports, products } = useStore(st => st.data);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { patients: [], wounds: [], visits: [], products: [] };

    const matchedPatients = patients.filter(p => 
      p.name.toLowerCase().includes(q) || (p.cpf && p.cpf.includes(q))
    );

    const matchedWounds = wounds.filter(w => 
      w.location.toLowerCase().includes(q) || w.etiology.toLowerCase().includes(q)
    );

    const matchedVisits = visits.filter(v => 
      v.plan?.toLowerCase().includes(q) || v.date.includes(q)
    );

    const matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(q)
    );

    return {
      patients: matchedPatients,
      wounds: matchedWounds,
      visits: matchedVisits,
      products: matchedProducts
    };
  }, [query, patients, wounds, visits, products]);

  const totalResults = results.patients.length + results.wounds.length + results.visits.length + results.products.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header de Busca */}
          <View style={s.between}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={styles.title}>Busca Global</Txt>
              <Txt muted style={{ fontSize: 12 }}>Pesquise por pacientes, feridas, produtos ou relatórios</Txt>
            </View>
            <IconButton icon={X} label="Fechar" onPress={onClose} />
          </View>

          {/* Campo de Busca com Ícone */}
          <Field 
            label="" 
            placeholder="Digite nome, ferida, conduta ou cobertura..." 
            value={query} 
            onChangeText={setQuery} 
            autoFocus 
          />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
            {/* Pacientes Encontrados */}
            {results.patients.length > 0 && (
              <View style={{ gap: 6 }}>
                <Txt style={styles.groupLabel}>PACIENTES ({results.patients.length})</Txt>
                {results.patients.map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      onClose();
                      router.push(`/patient/${p.id}` as never);
                    }}
                    style={styles.resultItem}
                  >
                    <User size={18} color={c.red} />
                    <View style={{ flex: 1 }}>
                      <Txt style={styles.itemTitle}>{p.name}</Txt>
                      <Txt muted style={{ fontSize: 12 }}>Status: {p.status}</Txt>
                    </View>
                    <Badge tone="neutral">Ver Prontuário</Badge>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Feridas Encontradas */}
            {results.wounds.length > 0 && (
              <View style={{ gap: 6 }}>
                <Txt style={styles.groupLabel}>FERIDAS E LESÕES ({results.wounds.length})</Txt>
                {results.wounds.map(w => {
                  const p = patients.find(x => x.id === w.patientId);
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => {
                        onClose();
                        if (p) router.push(`/patient/${p.id}` as never);
                      }}
                      style={styles.resultItem}
                    >
                      <HeartPulse size={18} color={c.amber} />
                      <View style={{ flex: 1 }}>
                        <Txt style={styles.itemTitle}>{w.location}</Txt>
                        <Txt muted style={{ fontSize: 12 }}>{w.etiology} · Paciente: {p?.name}</Txt>
                      </View>
                      <Badge tone={w.status === 'Cicatrizada' ? 'green' : 'red'}>{w.status}</Badge>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Produtos Encontrados */}
            {results.products.length > 0 && (
              <View style={{ gap: 6 }}>
                <Txt style={styles.groupLabel}>PRODUTOS E COBERTURAS ({results.products.length})</Txt>
                {results.products.map(prod => (
                  <View key={prod.id} style={styles.resultItem}>
                    <Package size={18} color={c.secondary} />
                    <View style={{ flex: 1 }}>
                      <Txt style={styles.itemTitle}>{prod.name}</Txt>
                      <Txt muted style={{ fontSize: 12 }}>Catálogo clínico validado</Txt>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {query.trim() && totalResults === 0 && (
              <Empty 
                icon={Search} 
                title="Nenhum resultado encontrado" 
                description={`Não foram encontrados registros para "${query}".`} 
              />
            )}
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
  title: { fontFamily: fonts.brand, fontSize: 20, color: c.text },
  groupLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, color: c.secondary, marginTop: 6 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 14, color: c.text },
});
