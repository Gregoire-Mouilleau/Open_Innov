import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { t } from '../../../i18n';
import { st } from '../styles';

export default function Navbar({ activeKey, setActiveKey, user, onLogin, onLogout, onSettings, onCompany }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  // Les onglets du haut pilotent la même navigation que le menu de gauche.
  // « Tableau de bord » = écran principal (overview).
  const tabs = [
    { key: 'overview',  label: t('nav.dashboard') },
    { key: 'parcelles', label: 'Parcelles' },
    { key: 'reports',   label: t('nav.reports') },
  ];
  return (
    <>
      <View style={st.navbar}>
        <View style={st.brand}>
          <View style={st.brandIcon}><Text style={{ fontSize: 15 }}>🌿</Text></View>
          <Text style={st.brandTxt}>{t('nav.brand')}</Text>
        </View>
        <View style={st.navTabs}>
          {tabs.map((item, i) => (
            <React.Fragment key={item.key}>
              {i > 0 && <Text style={st.navSep}>|</Text>}
              <TouchableOpacity onPress={() => setActiveKey(item.key)} style={st.navTabWrap}>
                <Text style={[st.navTab, activeKey === item.key && st.navTabOn]}>{item.label}</Text>
                {activeKey === item.key && <View style={st.navUnderline} />}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
        <View style={st.navRight}>
          {/* Cloche notifications */}
          <TouchableOpacity
            style={[st.bellBtn, showNotifs && st.bellBtnActive]}
            onPress={() => { setShowNotifs(v => !v); setShowMenu(false); }}
            activeOpacity={0.8}
          >
            <Text style={st.bellIcon}>🔔</Text>
          </TouchableOpacity>
          {user ? (
            <TouchableOpacity
              style={[st.userBtn, showMenu && st.userBtnActive]}
              onPress={() => { setShowMenu(v => !v); setShowNotifs(false); }}
              activeOpacity={0.8}
            >
              <View style={[st.avatarGuest, { borderColor: showMenu ? COLORS.accent : '#334' }]}>
                <Text style={{ color: COLORS.accent, fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text style={st.navUserEmail} numberOfLines={1}>{user.email}</Text>
                {user.isAdmin && <Text style={st.navUserRole}>{t('nav.admin')}</Text>}
              </View>
              <Text style={st.chevron}>{showMenu ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={st.avatarGuest}>
                <Text style={{ color: '#aaa', fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text style={st.navGuestLabel}>{t('nav.notConnected')}</Text>
              </View>
              <TouchableOpacity style={st.loginBtn} onPress={onLogin}>
                <Text style={st.loginBtnTxt}>{t('nav.login')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Overlay transparent pour fermer les menus */}
      {(showMenu || showNotifs) && (
        <TouchableOpacity
          style={st.menuOverlay}
          activeOpacity={1}
          onPress={() => { setShowMenu(false); setShowNotifs(false); }}
        />
      )}

      {/* Popup notifications */}
      {showNotifs && (
        <View style={st.notifsDropdown}>
          <View style={st.notifsHeader}>
            <Text style={st.notifsTitle}>🔔 Notifications</Text>
          </View>
          <View style={st.dropdownDiv} />
          <View style={st.notifsEmpty}>
            <Text style={st.notifsEmptyIcon}>🌿</Text>
            <Text style={st.notifsEmptyTxt}>Aucune notification</Text>
            <Text style={st.notifsEmptySub}>Vous êtes à jour !</Text>
          </View>
        </View>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <View style={st.dropdown}>
          {/* En-tête avec avatar et infos */}
          <View style={st.dropdownHeader}>
            <View style={st.dropdownAvatar}>
              <Text style={{ fontSize: 22 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownEmail} numberOfLines={1}>{user?.email}</Text>
              <Text style={st.dropdownRole}>{user?.isAdmin ? t('userMenu.roleAdmin') : t('userMenu.roleUser')}</Text>
            </View>
          </View>
          <View style={st.dropdownDiv} />
          {/* Paramètres du compte */}
          <TouchableOpacity style={st.dropdownItem} onPress={() => { setShowMenu(false); onSettings?.(); }}>
            <Text style={{ fontSize: 17 }}>⚙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownItemTxt}>{t('userMenu.settings')}</Text>
              <Text style={st.dropdownItemSub}>{t('userMenu.settingsSub')}</Text>
            </View>
            <Text style={st.dropdownArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.dropdownItem} onPress={() => { setShowMenu(false); onCompany?.(); }}>
            <Text style={{ fontSize: 17 }}>🏢</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownItemTxt}>{t('userMenu.company')}</Text>
              <Text style={st.dropdownItemSub}>{t('userMenu.companySub')}</Text>
            </View>
            <Text style={st.dropdownArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.dropdownItem} onPress={() => setShowMenu(false)}>
            <Text style={{ fontSize: 17 }}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownItemTxt}>{t('userMenu.notifications')}</Text>
              <Text style={st.dropdownItemSub}>{t('userMenu.notificationsSub')}</Text>
            </View>
            <Text style={st.dropdownArrow}>›</Text>
          </TouchableOpacity>
          <View style={st.dropdownDiv} />
          {/* Déconnexion */}
          <TouchableOpacity style={[st.dropdownItem, st.dropdownLogoutItem]} onPress={() => { setShowMenu(false); onLogout(); }}>
            <Text style={{ fontSize: 17 }}>🚪</Text>
            <Text style={st.dropdownLogoutTxt}>{t('userMenu.logout')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
