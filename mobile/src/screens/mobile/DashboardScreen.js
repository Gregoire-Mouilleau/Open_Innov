import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  ScrollView, PanResponder, Dimensions, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { t } from '../../i18n';
import { WidgetContent } from '../../components/mobile/WidgetContent';
import AddWidgetModal from '../../components/mobile/AddWidgetModal';

const isWeb = Platform.OS === 'web';
const GAP = isWeb ? 16 : 10;
const PADDING = isWeb ? 24 : 16;
const ROW_HEIGHT = isWeb ? 220 : 130;

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
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
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

  const setViewRef = (ri, ci, ref) => { viewRefsRef.current[ri + '-' + ci] = ref; };

  const measureAll = () => {
    rowsRef.current.forEach((row, ri) => {
      row.forEach((_item, ci) => {
        const ref = viewRefsRef.current[ri + '-' + ci];
        if (ref) {
          ref.measure((_fx, _fy, rw, rh, px, py) => {
            layoutsRef.current[ri + '-' + ci] = { x: px, y: py, w: rw, h: rh };
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
        const l = layoutsRef.current[ri + '-' + ci];
        if (l) { minY = Math.min(minY, l.y); maxY = Math.max(maxY, l.y + l.h); }
      });
      return minY === Infinity ? null : { ri, minY, maxY };
    }).filter(Boolean);
    if (rowBoxes.length === 0) return null;
    if (pageY < rowBoxes[0].minY) return { type: 'new-row', afterRowIdx: -1 };
    if (pageY > rowBoxes[rowBoxes.length - 1].maxY) return { type: 'new-row', afterRowIdx: rowBoxes[rowBoxes.length - 1].ri };
    for (let i = 0; i < rowBoxes.length - 1; i++) {
      if (pageY > rowBoxes[i].maxY && pageY < rowBoxes[i + 1].minY)
        return { type: 'new-row', afterRowIdx: rowBoxes[i].ri };
    }
    let closestRi = rowBoxes[0].ri, minDist = Infinity;
    for (const { ri, minY, maxY } of rowBoxes) {
      const dist = Math.abs(pageY - (minY + maxY) / 2);
      if (dist < minDist) { minDist = dist; closestRi = ri; }
    }
    const row = rs[closestRi];
    for (let ci = 0; ci < row.length; ci++) {
      const l = layoutsRef.current[closestRi + '-' + ci];
      if (l && pageX <= l.x + l.w / 2) return { type: 'in-row', rowIdx: closestRi, insertBefore: ci };
    }
    return { type: 'in-row', rowIdx: closestRi, insertBefore: row.length };
  };

  const handleDragStart = (x, y, ri, ci) => {
    measureAll();
    isDraggingRef.current = true;
    dragSrcRef.current = { rowIdx: ri, colIdx: ci };
    setDragSrc({ rowIdx: ri, colIdx: ci });
    setFloatPos({ x, y });
    setScrollEnabled(false);
    const initial = { type: 'in-row', rowIdx: ri, insertBefore: ci };
    dropTargetRef.current = initial;
    setDropTarget(initial);
  };

  const handleDragEnd = () => {
    const di = dragSrcRef.current;
    const dt = dropTargetRef.current;
    isDraggingRef.current = false;
    dragSrcRef.current = null;
    dropTargetRef.current = null;
    setDragSrc(null);
    setDropTarget(null);
    setScrollEnabled(true);
    if (di && dt) applyDrop(di, dt);
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
        } else { newRows.push([draggedItem]); }
      }
      return newRows;
    });
  };

  useEffect(() => {
    if (!isWeb) return;
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      setFloatPos({ x: e.clientX, y: e.clientY });
      const target = findDropTarget(e.clientX, e.clientY);
      if (target) { dropTargetRef.current = target; setDropTarget(target); }
    };
    const onMouseUp = () => { if (isDraggingRef.current) handleDragEnd(); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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
      onPanResponderRelease: () => handleDragEnd(),
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

  const getRowWidgetWidth = (rowLen) => (containerWidth - PADDING * 2 - GAP * (rowLen - 1)) / rowLen;
  const isDragging = dragSrc !== null;
  const draggedWidget = isDragging ? rows[dragSrc.rowIdx]?.[dragSrc.colIdx] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCenter} pointerEvents="none">
          <Image source={require('../../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>TechFarm</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>{t('dashboard.addWidget')}</Text>
        </TouchableOpacity>
      </View>

      <View
        style={styles.flex}
        {...(!isWeb ? containerPan.panHandlers : {})}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {dropTarget?.type === 'new-row' && dropTarget.afterRowIdx === -1 && <View style={styles.hDropIndicator} />}

          {rows.map((row, ri) => (
            <View key={'block-' + ri}>
              <View style={styles.row}>
                {row.map((item, ci) => {
                  const isDragSrc = dragSrc?.rowIdx === ri && dragSrc?.colIdx === ci;
                  const showVBefore = dropTarget?.type === 'in-row' && dropTarget.rowIdx === ri && dropTarget.insertBefore === ci;
                  return (
                    <React.Fragment key={item.key}>
                      {showVBefore && <View style={[styles.vDropIndicator, { height: ROW_HEIGHT }]} />}
                      <View
                        ref={(ref) => setViewRef(ri, ci, ref)}
                        style={[{ width: getRowWidgetWidth(row.length) }, isDragSrc && styles.widgetDragging, isWeb && styles.widgetCursorWeb]}
                        {...(isWeb ? { onMouseDown: (e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY, ri, ci); } } : {})}
                      >
                        <Pressable
                          onLongPress={!isWeb ? (e) => handleDragStart(e.nativeEvent.pageX, e.nativeEvent.pageY, ri, ci) : undefined}
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
                                onPress={() => setRows((prev) => { const nr = prev.map((r) => [...r]); nr[ri].splice(ci, 1); return nr.filter((r) => r.length > 0); })}
                                {...(isWeb ? { onMouseDown: (e) => e.stopPropagation() } : {})}
                              >
                                <Text style={styles.removeBtnText}>x</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </Pressable>
                        <Text style={styles.widgetLabel}>{t('widgets.' + item.id)}</Text>
                      </View>
                    </React.Fragment>
                  );
                })}
                {dropTarget?.type === 'in-row' && dropTarget.rowIdx === ri && dropTarget.insertBefore === row.length && (
                  <View style={[styles.vDropIndicator, { height: ROW_HEIGHT }]} />
                )}
              </View>
              {dropTarget?.type === 'new-row' && dropTarget.afterRowIdx === ri && <View style={styles.hDropIndicator} />}
            </View>
          ))}
        </ScrollView>
      </View>

      {isDragging && draggedWidget && (
        <View pointerEvents="none" style={[styles.ghost, { width: containerWidth * 0.45, height: ROW_HEIGHT, left: floatPos.x - (containerWidth * 0.45) / 2, top: floatPos.y - ROW_HEIGHT / 2 }]}>
          <WidgetContent widgetId={draggedWidget.id} />
        </View>
      )}

      <AddWidgetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={(widget) => {
          const flat = rows.flat();
          if (!flat.some((ww) => ww.id === widget.id)) setRows((prev) => [...prev, [{ id: widget.id, key: widget.id }]]);
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
    justifyContent: 'flex-end',
    paddingHorizontal: PADDING,
    paddingVertical: isWeb ? 14 : 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerLogo: { width: 36, height: 36 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', letterSpacing: 0.5 },
  addBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  grid: { padding: PADDING, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  widgetDragging: { opacity: 0.2 },
  widgetCursorWeb: { cursor: 'grab' },
  widgetCard: { backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  dragHint: { position: 'absolute', bottom: 4, right: 6 },
  dragHintText: { color: COLORS.textSecondary, fontSize: 14 },
  widgetLabel: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4 },
  hDropIndicator: { height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginVertical: 4, width: '100%' },
  vDropIndicator: { width: 3, backgroundColor: COLORS.accent, borderRadius: 2, alignSelf: 'center' },
  ghost: { position: 'absolute', backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.accent, opacity: 0.88, elevation: 14, zIndex: 999 },
});