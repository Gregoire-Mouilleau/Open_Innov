import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  PanResponder,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import { WidgetContent } from '../components/WidgetContent';
import AddWidgetModal from '../components/AddWidgetModal';

const { width } = Dimensions.get('window');
const GAP = 10;
const PADDING = 16;
const ROW_HEIGHT = 130;

const WIDGET_CATALOG = {
  camera_live: { id: 'camera_live' },
  camera_ia:   { id: 'camera_ia' },
  map:         { id: 'map' },
  temperature: { id: 'temperature' },
  humidity:    { id: 'humidity' },
  luminosity:  { id: 'luminosity' },
  diseases:    { id: 'diseases' },
};

const w = (id) => ({ ...WIDGET_CATALOG[id], key: id });

const DEFAULT_ROWS = [
  [w('camera_live'), w('camera_ia')],
  [w('map')],
  [w('temperature'), w('humidity'), w('luminosity')],
  [w('diseases')],
];

export default function DashboardScreen() {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [modalVisible, setModalVisible] = useState(false);
  const [dragSrc, setDragSrc] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [floatPos, setFloatPos] = useState({ x: 0, y: 0 });
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const isDraggingRef = useRef(false);
  const dragSrcRef = useRef(null);
  const dropTargetRef = useRef(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const layoutsRef = useRef({});
  const viewRefsRef = useRef({});

  const setViewRef = (ri, ci, ref) => {
    viewRefsRef.current[`${ri}-${ci}`] = ref;
  };

  const measureAll = () => {
    rowsRef.current.forEach((row, ri) => {
      row.forEach((_item, ci) => {
        const ref = viewRefsRef.current[`${ri}-${ci}`];
        if (ref) {
          ref.measure((_fx, _fy, rw, rh, px, py) => {
            layoutsRef.current[`${ri}-${ci}`] = { x: px, y: py, w: rw, h: rh };
          });
        }
      });
    });
  };

  const findDropTarget = (pageX, pageY) => {
    const rs = rowsRef.current;

    const rowBoxes = rs.map((row, ri) => {
      let minY = Infinity, maxY = -Infinity;
      row.forEach((_item, ci) => {
        const l = layoutsRef.current[`${ri}-${ci}`];
        if (l) { minY = Math.min(minY, l.y); maxY = Math.max(maxY, l.y + l.h); }
      });
      return minY === Infinity ? null : { ri, minY, maxY };
    }).filter(Boolean);

    if (rowBoxes.length === 0) return null;

    // Check if finger is in a gap between rows -> propose new row
    if (pageY < rowBoxes[0].minY) return { type: 'new-row', afterRowIdx: -1 };
    if (pageY > rowBoxes[rowBoxes.length - 1].maxY) return { type: 'new-row', afterRowIdx: rowBoxes[rowBoxes.length - 1].ri };
    for (let i = 0; i < rowBoxes.length - 1; i++) {
      if (pageY > rowBoxes[i].maxY && pageY < rowBoxes[i + 1].minY) {
        return { type: 'new-row', afterRowIdx: rowBoxes[i].ri };
      }
    }

    // Find closest row by Y center
    let closestRi = rowBoxes[0].ri;
    let minDist = Infinity;
    for (const { ri, minY, maxY } of rowBoxes) {
      const dist = Math.abs(pageY - (minY + maxY) / 2);
      if (dist < minDist) { minDist = dist; closestRi = ri; }
    }

    // Within row, find insertion point by X
    const row = rs[closestRi];
    for (let ci = 0; ci < row.length; ci++) {
      const l = layoutsRef.current[`${closestRi}-${ci}`];
      if (l && pageX <= l.x + l.w / 2) {
        return { type: 'in-row', rowIdx: closestRi, insertBefore: ci };
      }
    }
    return { type: 'in-row', rowIdx: closestRi, insertBefore: row.length };
  };

  const handleLongPress = (evt, ri, ci) => {
    const { pageX, pageY } = evt.nativeEvent;
    measureAll();
    isDraggingRef.current = true;
    dragSrcRef.current = { rowIdx: ri, colIdx: ci };
    setDragSrc({ rowIdx: ri, colIdx: ci });
    setFloatPos({ x: pageX, y: pageY });
    setScrollEnabled(false);
    const initial = { type: 'in-row', rowIdx: ri, insertBefore: ci };
    dropTargetRef.current = initial;
    setDropTarget(initial);
  };

  const applyDrop = (di, dt) => {
    setRows((prev) => {
      let newRows = prev.map((row) => [...row]);
      const draggedItem = newRows[di.rowIdx][di.colIdx];
      newRows[di.rowIdx].splice(di.colIdx, 1);

      if (dt.type === 'new-row') {
        let afterIdx = dt.afterRowIdx;
        if (newRows[di.rowIdx].length === 0 && di.rowIdx <= afterIdx) afterIdx--;
        newRows = newRows.filter((row) => row.length > 0);
        const insertAt = Math.max(0, Math.min(afterIdx + 1, newRows.length));
        newRows.splice(insertAt, 0, [draggedItem]);
      } else {
        let { rowIdx, insertBefore } = dt;
        if (di.rowIdx === rowIdx && di.colIdx < insertBefore) insertBefore--;
        if (newRows[di.rowIdx].length === 0 && di.rowIdx < rowIdx) rowIdx--;
        newRows = newRows.filter((row) => row.length > 0);

        if (rowIdx >= 0 && rowIdx < newRows.length) {
          const targetRow = newRows[rowIdx];
          if (targetRow.length < 3) {
            targetRow.splice(Math.max(0, Math.min(insertBefore, targetRow.length)), 0, draggedItem);
          } else {
            newRows.splice(Math.max(0, Math.min(rowIdx, newRows.length)), 0, [draggedItem]);
          }
        } else {
          newRows.push([draggedItem]);
        }
      }
      return newRows;
    });
  };

  const containerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => isDraggingRef.current,
      onMoveShouldSetPanResponderCapture: () => isDraggingRef.current,
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        setFloatPos({ x: pageX, y: pageY });
        const target = findDropTarget(pageX, pageY);
        if (target) { dropTargetRef.current = target; setDropTarget(target); }
      },
      onPanResponderRelease: () => {
        const di = dragSrcRef.current;
        const dt = dropTargetRef.current;
        isDraggingRef.current = false;
        dragSrcRef.current = null;
        dropTargetRef.current = null;
        setDragSrc(null);
        setDropTarget(null);
        setScrollEnabled(true);
        if (di && dt) applyDrop(di, dt);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        dragSrcRef.current = null;
        dropTargetRef.current = null;
        setDragSrc(null);
        setDropTarget(null);
        setScrollEnabled(true);
      },
    })
  ).current;

  const getRowWidgetWidth = (rowLen) =>
    (width - PADDING * 2 - GAP * (rowLen - 1)) / rowLen;

  const isDragging = dragSrc !== null;
  const draggedWidget = isDragging ? rows[dragSrc.rowIdx]?.[dragSrc.colIdx] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>TechFarm</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>{t('dashboard.addWidget')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.flex} {...containerPan.panHandlers}>
        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {/* Indicator before first row */}
          {dropTarget?.type === 'new-row' && dropTarget.afterRowIdx === -1 && (
            <View style={styles.hDropIndicator} />
          )}

          {rows.map((row, ri) => (
            <View key={`block-${ri}`}>
              <View style={styles.row}>
                {row.map((item, ci) => {
                  const isDragSrc = dragSrc?.rowIdx === ri && dragSrc?.colIdx === ci;
                  const showVBefore =
                    dropTarget?.type === 'in-row' &&
                    dropTarget.rowIdx === ri &&
                    dropTarget.insertBefore === ci;

                  return (
                    <React.Fragment key={item.key}>
                      {showVBefore && <View style={styles.vDropIndicator} />}
                      <View
                        ref={(ref) => setViewRef(ri, ci, ref)}
                        style={[
                          { width: getRowWidgetWidth(row.length) },
                          isDragSrc && styles.widgetDragging,
                        ]}
                      >
                        <Pressable
                          onLongPress={(e) => handleLongPress(e, ri, ci)}
                          delayLongPress={350}
                          style={[styles.widgetCard, { height: ROW_HEIGHT }]}
                        >
                          <WidgetContent widgetId={item.id} />
                          {!isDragging && (
                            <>
                              <View style={styles.dragHint} pointerEvents="none">
                                <Text style={styles.dragHintText}>⠿</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() =>
                                  setRows((prev) => {
                                    const nr = prev.map((r) => [...r]);
                                    nr[ri].splice(ci, 1);
                                    return nr.filter((r) => r.length > 0);
                                  })
                                }
                              >
                                <Text style={styles.removeBtnText}>&#x2715;</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </Pressable>
                        <Text style={styles.widgetLabel}>{t(`widgets.${item.id}`)}</Text>
                      </View>
                    </React.Fragment>
                  );
                })}

                {/* Indicator after last widget in row */}
                {dropTarget?.type === 'in-row' &&
                  dropTarget.rowIdx === ri &&
                  dropTarget.insertBefore === row.length && (
                    <View style={styles.vDropIndicator} />
                  )}
              </View>

              {/* Horizontal indicator after this row */}
              {dropTarget?.type === 'new-row' && dropTarget.afterRowIdx === ri && (
                <View style={styles.hDropIndicator} />
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Ghost widget following finger */}
      {isDragging && draggedWidget && (
        <View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              width: width * 0.45,
              height: ROW_HEIGHT,
              left: floatPos.x - (width * 0.45) / 2,
              top: floatPos.y - ROW_HEIGHT / 2,
            },
          ]}
        >
          <WidgetContent widgetId={draggedWidget.id} />
        </View>
      )}

      <AddWidgetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={(widget) => {
          const flat = rows.flat();
          if (!flat.some((ww) => ww.id === widget.id)) {
            const item = { id: widget.id, key: widget.id };
            setRows((prev) => [...prev, [item]]);
          }
          setModalVisible(false);
        }}
        activeWidgets={rows.flat().map((ww) => ww.id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 36, height: 36 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', letterSpacing: 0.5 },
  addBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  grid: { padding: PADDING, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  widgetDragging: { opacity: 0.2 },
  widgetCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  dragHint: { position: 'absolute', bottom: 4, right: 6 },
  dragHintText: { color: COLORS.textSecondary, fontSize: 14 },
  widgetLabel: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4 },
  hDropIndicator: {
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginVertical: 4,
    width: '100%',
  },
  vDropIndicator: {
    width: 3,
    height: ROW_HEIGHT,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    alignSelf: 'center',
  },
  ghost: {
    position: 'absolute',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.accent,
    opacity: 0.88,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    zIndex: 999,
  },
});
