import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { COLORS, ALL_WIDGETS } from '../constants/theme';
import { t } from '../i18n';
import { WidgetContent } from './WidgetContent';

const { width } = Dimensions.get('window');
const PREVIEW_SIZE = (width - 32 - 12) / 2;

export default function AddWidgetModal({ visible, onClose, onAdd, activeWidgets }) {
  const [selected, setSelected] = useState(null);

  const handleConfirm = () => {
    if (selected) {
      onAdd(selected);
      setSelected(null);
    }
  };

  const renderWidget = ({ item }) => {
    const isSelected = selected?.id === item.id;
    const isActive = activeWidgets.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.previewCard,
          isSelected && styles.previewCardSelected,
          isActive && styles.previewCardActive,
        ]}
        onPress={() => !isActive && setSelected(item)}
        activeOpacity={0.8}
      >
        <View style={{ height: PREVIEW_SIZE * 0.65 }}>
          <WidgetContent widgetId={item.id} />
        </View>
        <Text style={[styles.previewLabel, isActive && styles.previewLabelActive]}>
          {t(`widgets.${item.id}`)}
          {isActive ? t('modal.alreadyAdded') : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ width: 30 }} />
            <Text style={styles.sheetTitle}>{t('modal.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sheetSubtitle}>{t('modal.subtitle')}</Text>

          <FlatList
            data={ALL_WIDGETS}
            renderItem={renderWidget}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selected}
          >
            <Text style={styles.confirmBtnText}>{t('modal.addButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  sheetSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  previewCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  previewCardSelected: {
    borderColor: COLORS.selected,
  },
  previewCardActive: {
    opacity: 0.4,
  },
  previewLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  previewLabelActive: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  confirmBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
