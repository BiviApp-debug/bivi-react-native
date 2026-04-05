import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import COLORS from '../../utils/colors';
import {
  getGames,
  getMissions,
  getSurveys,
  getUserGameHistory,
  getUserMissionHistory,
  getUserSurveyHistory,
} from './Biviconnectapi';

type HistoryType = 'mission' | 'survey' | 'game';

type UnifiedHistoryItem = {
  id: string;
  type: HistoryType;
  title: string;
  points: number;
  completedAt: string;
};

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  userPhone: string;
}

const getPointsValue = (item: any): number => {
  const value =
    item?.pointsEarned ??
    item?.rewardPoints ??
    item?.pointsRedeemed ??
    item?.points ??
    item?.reward_points ??
    0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCompletedDate = (item: any): string => {
  return (
    item?.completedAt ||
    item?.playedAt ||
    item?.watchedAt ||
    item?.createdAt ||
    item?.created_at ||
    new Date().toISOString()
  );
};

const asMapById = (items: any[] | undefined): Record<string, any> => {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc: Record<string, any>, item: any) => {
    if (item?.id !== undefined && item?.id !== null) {
      acc[String(item.id)] = item;
    }
    return acc;
  }, {});
};

const typeMeta: Record<HistoryType, { label: string; icon: string; color: string }> = {
  mission: { label: 'Mision', icon: '🎯', color: '#0ea5e9' },
  survey: { label: 'Encuesta', icon: '📝', color: '#8b5cf6' },
  game: { label: 'Juego', icon: '🎮', color: '#10b981' },
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HistoryModal: React.FC<HistoryModalProps> = ({ visible, onClose, userPhone }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UnifiedHistoryItem[]>([]);

  useEffect(() => {
    const loadUnifiedHistory = async () => {
      if (!visible || !userPhone) return;

      setLoading(true);
      try {
        const [missionHistoryRes, surveyHistoryRes, gameHistoryRes, missionsRes, surveysRes, gamesRes] = await Promise.all([
          getUserMissionHistory(userPhone),
          getUserSurveyHistory(userPhone),
          getUserGameHistory(userPhone),
          getMissions(userPhone),
          getSurveys(userPhone),
          getGames(userPhone),
        ]);

        const missionMap = asMapById(missionsRes?.success ? missionsRes.data : []);
        const surveyMap = asMapById(surveysRes?.success ? surveysRes.data : []);
        const gameMap = asMapById(gamesRes?.success ? gamesRes.data : []);

        const missionItems: UnifiedHistoryItem[] = (missionHistoryRes?.success ? missionHistoryRes.data : []).map((h: any, index: number) => {
          const missionId = String(h?.missionId ?? h?.itemId ?? h?.id ?? `m-${index}`);
          const mission = missionMap[missionId];
          return {
            id: String(h?.id ?? `mission-${missionId}-${index}`),
            type: 'mission',
            title: mission?.title || h?.missionTitle || `Mision ${missionId}`,
            points: getPointsValue(h),
            completedAt: getCompletedDate(h),
          };
        });

        const surveyItems: UnifiedHistoryItem[] = (surveyHistoryRes?.success ? surveyHistoryRes.data : []).map((h: any, index: number) => {
          const surveyId = String(h?.surveyId ?? h?.itemId ?? h?.id ?? `s-${index}`);
          const survey = surveyMap[surveyId];
          return {
            id: String(h?.id ?? `survey-${surveyId}-${index}`),
            type: 'survey',
            title: survey?.title || h?.surveyTitle || `Encuesta ${surveyId}`,
            points: getPointsValue(h),
            completedAt: getCompletedDate(h),
          };
        });

        const gameItems: UnifiedHistoryItem[] = (gameHistoryRes?.success ? gameHistoryRes.data : []).map((h: any, index: number) => {
          const gameId = String(h?.gameId ?? h?.itemId ?? h?.id ?? `g-${index}`);
          const game = gameMap[gameId];
          return {
            id: String(h?.id ?? `game-${gameId}-${index}`),
            type: 'game',
            title: game?.title || h?.gameTitle || `Juego ${gameId}`,
            points: getPointsValue(h),
            completedAt: getCompletedDate(h),
          };
        });

        const merged = [...missionItems, ...surveyItems, ...gameItems].sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );

        setItems(merged);
      } catch (error) {
        console.error('Error cargando historial unificado:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadUnifiedHistory();
  }, [visible, userPhone]);

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.points += item.points;
        acc[item.type] += 1;
        return acc;
      },
      { total: 0, points: 0, mission: 0, survey: 0, game: 0 }
    );
  }, [items]);

  const renderItem = ({ item }: { item: UnifiedHistoryItem }) => {
    const meta = typeMeta[item.type];
    return (
      <View style={[styles.itemCard, { borderLeftColor: meta.color }]}> 
        <View style={styles.itemTopRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {meta.icon} {item.title}
          </Text>
          <Text style={[styles.itemPoints, { color: meta.color }]}>+{item.points} MB</Text>
        </View>

        <View style={styles.itemBottomRow}>
          <Text style={styles.itemType}>{meta.label}</Text>
          <Text style={styles.itemDate}>{formatDate(item.completedAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Logros</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Completados por el usuario</Text>
          <Text style={styles.summaryMain}>{summary.total} actividades</Text>
          <Text style={styles.summaryPoints}>Total ganado: {summary.points} MB</Text>
          <Text style={styles.summaryBreakdown}>
            Misiones: {summary.mission} | Encuestas: {summary.survey} | Juegos: {summary.game}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Cargando historial...</Text>
          </View>
        ) : items.length > 0 ? (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.centerState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.stateText}>No hay misiones, encuestas o juegos completados aun.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fb',
    paddingTop: 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ececf3',
  },
  summaryTitle: {
    fontSize: 12,
    color: '#666',
  },
  summaryMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginTop: 4,
  },
  summaryPoints: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryBreakdown: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#ececf3',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  itemPoints: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemType: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  itemDate: {
    fontSize: 12,
    color: '#777',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 42,
  },
});

export default HistoryModal;
