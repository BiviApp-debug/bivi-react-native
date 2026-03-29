import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  FlatList,
  Dimensions,
  StyleSheet
} from 'react-native';
import { getAdvertising } from '../utils/advertisingService';
import COLORS from '../utils/colors';

const { width } = Dimensions.get('window');

type AdItem = {
  id: number | string;
  image: string;
  coment?: string;
};

type Props = {
  featured?: boolean;
};

export default function AdvertisingCarousel({ featured = false }: Props) {
  const [data, setData] = useState<AdItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<AdItem> | null>(null);
  const activeIndexRef = useRef(0);

  const cardWidth = useMemo(
    () => (featured ? width - 32 : width - 40),
    [featured]
  );

  useEffect(() => {
    const loadAdvertising = async () => {
      const result = await getAdvertising();
      setData(Array.isArray(result) ? result : []);
    };

    loadAdvertising();
  }, []);

  useEffect(() => {
    if (data.length <= 1) return;

    const id = setInterval(() => {
      const next = (activeIndexRef.current + 1) % data.length;
      activeIndexRef.current = next;
      setActiveIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3200);

    return () => clearInterval(id);
  }, [data.length]);

  const onMomentumEnd = (e: any) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    activeIndexRef.current = next;
    setActiveIndex(next);
  };

  const renderItem = ({ item }: { item: AdItem }) => (
    <View style={[styles.card, { width: cardWidth }, featured && styles.cardFeatured]}>
      <Image
        source={{ uri: item.image }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      {featured && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>PUBLICIDAD</Text>
        </View>
      )}
      {item.coment && (
        <Text style={styles.comment}>{item.coment}</Text>
      )}
    </View>
  );

  if (!data.length) return null;

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={data}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={cardWidth}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: AdItem, index) => String(item?.id ?? index)}
        renderItem={renderItem}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, index) => ({
          length: cardWidth,
          offset: cardWidth * index,
          index,
        })}
      />

      {data.length > 1 && (
        <View style={styles.dotsRow}>
          {data.map((_, i) => (
            <View
              key={`dot-${i}`}
              style={[styles.dot, activeIndex === i && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  card: {
    height: 186,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.25)',
    backgroundColor: COLORS.backgroundLight,
  },
  cardFeatured: {
    height: 220,
    borderWidth: 2,
    borderColor: 'rgba(255, 195, 0, 0.7)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 7,
  },
  image: {
    width: '100%',
    height: '100%'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  comment: {
    position: 'absolute',
    bottom: 14,
    left: 15,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.46)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: '88%',
  },
  tag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: COLORS.textDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 2,
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  dotActive: {
    width: 20,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
});
