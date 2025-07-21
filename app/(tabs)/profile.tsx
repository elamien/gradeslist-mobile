import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, LayoutAnimation, Platform, UIManager, RefreshControl, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppStore } from '../../store/useAppStore';
import { useCourses } from '../../hooks/useCourses';
import { GradescopeWebViewProxy, GradescopeProxyMethods } from '../../components/GradescopeWebViewProxy';
import { setGradescopeProxy, clearGradescopeProxy } from '../../utils/proxyRegistry';
import { NotificationService } from '../../services/notificationService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function ProfileScreen() {
  const { 
    connections, 
    selectedConnection,
    notificationsEnabled,
    notificationPreferences,
    setNotificationsEnabled,
    updateNotificationPreferences,
    setPushToken, 
    selectedTerm,
    selectedSeason,
    selectedYear,
    selectedCourseIds,
    setSelectedConnection, 
    connectPlatform, 
    disconnectPlatform,
    setSelectedTerm,
    toggleCourseSelection
  } = useAppStore();
  
  const { data: availableCourses, isLoading: coursesLoading, refetch: refetchCourses } = useCourses();
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGradescopeCredentialsModal, setShowGradescopeCredentialsModal] = useState(false);
  
  const [gradescopeEmail, setGradescopeEmail] = useState('');
  const [gradescopePassword, setGradescopePassword] = useState('');
  
  const gradescopeProxyRef = useRef<GradescopeProxyMethods>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'platforms' | 'settings' | 'privacy'>('platforms');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const connectedServices = connections.filter(conn => conn.isConnected);
  const availableServices = connections.filter(conn => !conn.isConnected);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchCourses();
      console.log('Courses refreshed successfully');
    } catch (error) {
      console.error('Error refreshing courses:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnect = (connection: any) => {
    try {
      console.log('handleConnect called with:', connection);
      setSelectedConnection(connection);
      // Always show credential collection modal (no more WebView step)
      setUsername('');
      setPassword('');
      setShowPassword(connection.id !== 'canvas'); // Show password except for Canvas
      setShowLoginModal(true);
    } catch (error) {
      console.error('Error in handleConnect:', error);
      Alert.alert('Error', 'Failed to open connection dialog');
    }
  };



  const handleGradescopeCredentialsSubmit = async () => {
    if (!gradescopeEmail.trim() || !gradescopePassword.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsConnecting(true);

    try {
      console.log('Connecting Gradescope with server-based credentials...');
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // Store real credentials for server-based auth
      await connectPlatform('gradescope', { 
        proxyReady: true, 
        loginData: { serverBased: true },
        // Real credentials for server
        username: gradescopeEmail.trim(),
        password: gradescopePassword.trim(),
        cookies: 'proxy-session-verified', // Keep this as marker
        lastLogin: new Date().toISOString()
      });

      // Close modal and clear form on success
      setShowGradescopeCredentialsModal(false);
      setGradescopeEmail('');
      setGradescopePassword('');
      
      Alert.alert('Success', 'Successfully connected to Gradescope via server!');
      
    } catch (error) {
      console.error('Gradescope server connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Gradescope server';
      Alert.alert('Connection Failed', errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (connection: any) => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect from ${connection.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: async () => {
            try {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await disconnectPlatform(connection.id);
              Alert.alert('Success', `Disconnected from ${connection.name}`);
            } catch {
              Alert.alert('Error', 'Failed to disconnect account');
            }
          }
        }
      ]
    );
  };

  const handleTabChange = (tab: 'platforms' | 'settings' | 'privacy') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  const handleLoginSubmit = async () => {
    if (selectedConnection?.id === 'canvas') {
      if (!username.trim()) {
        Alert.alert('Error', 'Please enter your Canvas API token');
        return;
      }
    } else {
      if (!username.trim() || !password.trim()) {
        Alert.alert('Error', 'Please enter both email and password');
        return;
      }
    }

    setIsConnecting(true);
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // For Canvas, use token field; for others, use username/password
      const credentials = selectedConnection?.id === 'canvas' 
        ? { token: username.trim() }
        : { username: username.trim(), password: password.trim() };
        
      await connectPlatform(selectedConnection!.id, credentials);
      
      // Clear form and close modal
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setShowLoginModal(false);
      
      Alert.alert('Success', `Successfully connected to ${selectedConnection!.name}!`);
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to platform';
      
      // Provide specific guidance for Gradescope authentication issues
      if (selectedConnection?.id === 'gradescope' && errorMessage.includes('verification')) {
        Alert.alert(
          'Gradescope Connection Issue', 
          'Gradescope appears to be blocking mobile app access. This may be due to additional security measures like 2FA or anti-bot protection. Please ensure your credentials are correct and try again, or contact support if the issue persists.'
        );
      } else {
        Alert.alert('Connection Failed', errorMessage);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'platforms':
        return (
          <View style={{ flex: 1 }}>
            {/* Connected Accounts */}
            {connectedServices.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#374151' }}>
                  Connected Accounts
                </Text>
                <View style={{ gap: 12 }}>
                  {connectedServices.map((connection) => (
                    <View key={connection.id} style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#e5e5e5',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          backgroundColor: connection.color + '20',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          <Text style={{ fontSize: 24 }}>{connection.icon}</Text>
                        </View>
                        
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                              {connection.name}
                            </Text>
                            <View style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 8,
                              backgroundColor: '#16a34a'
                            }}>
                              <Text style={{ 
                                fontSize: 10, 
                                color: 'white',
                                fontWeight: '500'
                              }}>
                                ✓ Syncing
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Last sync: 2m ago
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ 
                        flexDirection: 'row', 
                        gap: 8, 
                        marginTop: 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#f3f4f6'
                      }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#f8fafc',
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                            Settings
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDisconnect(connection)}
                          style={{
                            flex: 1,
                            backgroundColor: '#fef2f2',
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#fecaca',
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '500' }}>
                            Disconnect
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Add New Platform */}
            {availableServices.length > 0 && (
              <View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    padding: 20,
                    borderWidth: 2,
                    borderColor: '#e5e5e5',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    marginBottom: 16
                  }}
                >
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#f3f4f6',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <MaterialIcons name="add" size={24} color="#9ca3af" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                    Add New Platform
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                    Connect another platform to sync more assignments
                  </Text>
                </TouchableOpacity>

                <View style={{ gap: 8 }}>
                  {availableServices.map((connection) => (
                    <TouchableOpacity 
                      key={connection.id} 
                      activeOpacity={0.7}
                      onPress={() => handleConnect(connection)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#e5e5e5',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: connection.color + '20',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Text style={{ fontSize: 20 }}>{connection.icon}</Text>
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                          {connection.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {connection.description}
                        </Text>
                      </View>
                      
                      <View style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: '#f3f4f6',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <MaterialIcons name="add" size={12} color="#9ca3af" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      case 'settings':
        return (
          <View style={{ flex: 1 }}>
            {/* Sync Preferences */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#374151' }}>
                Sync Preferences
              </Text>
              
              {/* Academic Term */}
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e5e5',
                marginBottom: 12
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
                      Academic Term
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {selectedTerm}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowTermModal(true)}
                    style={{
                      backgroundColor: '#f8fafc',
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#e2e8f0'
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Course Selection */}
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e5e5',
                marginBottom: 12
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
                      Course Selection
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {selectedCourseIds.length} of {availableCourses?.length || 0} courses
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCourseModal(true)}
                    style={{
                      backgroundColor: '#f8fafc',
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#e2e8f0'
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                      Manage
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notifications */}
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e5e5',
                marginBottom: 12
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
                      Notifications
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={async (enabled) => {
                      if (enabled) {
                        try {
                          await NotificationService.initialize();
                          setNotificationsEnabled(true);
                          Alert.alert('Success', 'Notifications enabled!');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to enable notifications.');
                        }
                      } else {
                        setNotificationsEnabled(false);
                      }
                    }}
                    trackColor={{ false: '#e5e5e5', true: '#3b82f6' }}
                    thumbColor='#ffffff'
                  />
                </View>
              </View>

              {/* Data & Storage */}
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e5e5'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
                      Data & Storage
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Last sync: 2m ago
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleRefresh}
                    disabled={isRefreshing}
                    style={{
                      backgroundColor: isRefreshing ? '#f3f4f6' : '#eff6ff',
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: isRefreshing ? '#e5e5e5' : '#bfdbfe'
                    }}
                  >
                    <Text style={{ 
                      fontSize: 12, 
                      color: isRefreshing ? '#9ca3af' : '#1e40af', 
                      fontWeight: '500' 
                    }}>
                      {isRefreshing ? 'Syncing...' : 'Sync'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );

      case 'privacy':
        return (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#374151' }}>
              Privacy & Security
            </Text>

            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e5e5e5',
              marginBottom: 16
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <MaterialIcons name="lock" size={24} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 4, color: '#16a34a' }}>
                    Data Protection
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20 }}>
                    Your academic data is encrypted and never shared with third parties. All platform credentials are stored securely.
                  </Text>
                </View>
              </View>
            </View>

            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e5e5e5',
              marginBottom: 16
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <MaterialIcons name="folder" size={24} color="#3b82f6" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 4, color: '#3b82f6' }}>
                    Local Storage
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20 }}>
                    Assignments are cached on your device for offline access. You control what data is synced and stored.
                  </Text>
                </View>
              </View>
            </View>

            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e5e5e5',
              marginBottom: 16
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <MaterialIcons name="account-circle" size={24} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 4, color: '#f59e0b' }}>
                    Data Management
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 }}>
                    You own your data and can export or delete it at any time. Each platform connection can be managed independently.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#eff6ff',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#bfdbfe',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: '500' }}>
                        Export Data
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#fef2f2',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#fecaca',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '500' }}>
                        Delete Account
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ 
              borderTopWidth: 1, 
              borderTopColor: '#e5e5e5', 
              paddingTop: 16,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                Questions about privacy? Contact us at privacy@gradeslist.com
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>Profile</Text>
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
          Manage your account and sync preferences
        </Text>

        {/* Tab Navigation */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#e5e5e5'
        }}>
          {[
            { id: 'platforms', label: 'Platforms', icon: 'link' },
            { id: 'settings', label: 'Settings', icon: 'settings' },
            { id: 'privacy', label: 'Privacy', icon: 'security' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabChange(tab.id as any)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
              }}
            >
              <MaterialIcons 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.id ? 'white' : '#6b7280'} 
                style={{ marginRight: 4 }}
              />
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: activeTab === tab.id ? 'white' : '#6b7280'
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
            title="Pull to refresh"
            titleColor="#666"
          />
        }
      >
        <View style={{ padding: 16, paddingTop: 0 }}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Term Selection Modal */}
      <Modal
        visible={showTermModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400
          }}>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>
              Select Academic Term
            </Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>Season</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {['spring', 'summer', 'fall', 'winter'].map((season) => (
                  <TouchableOpacity
                    key={season}
                    onPress={() => setSelectedTerm(season as any, selectedYear)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: selectedSeason === season ? '#3b82f6' : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: selectedSeason === season ? '#3b82f6' : '#e5e5e5',
                    }}
                  >
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: '500',
                      color: selectedSeason === season ? 'white' : '#666',
                      textTransform: 'capitalize'
                    }}>
                      {season}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>Year</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[2024, 2025, 2026].map((year) => (
                  <TouchableOpacity
                    key={year}
                    onPress={() => setSelectedTerm(selectedSeason, year)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: selectedYear === year ? '#3b82f6' : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: selectedYear === year ? '#3b82f6' : '#e5e5e5',
                    }}
                  >
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: '500',
                      color: selectedYear === year ? 'white' : '#666'
                    }}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ 
              padding: 12,
              backgroundColor: '#f0f9ff',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#bfdbfe',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 14, color: '#1e40af', fontWeight: '500' }}>
                Current Selection: {selectedTerm}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#3b82f6',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => setShowTermModal(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: 'white' }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Course Selection Modal */}
      <Modal
        visible={showCourseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCourseModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400,
            maxHeight: '80%'
          }}>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>
              Manage Courses
            </Text>
            
            {coursesLoading ? (
              <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                Loading available courses...
              </Text>
            ) : availableCourses && availableCourses.length > 0 ? (
              <ScrollView style={{ maxHeight: 300, marginBottom: 20 }}>
                <View style={{ gap: 8 }}>
                  {availableCourses.map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      onPress={() => toggleCourseSelection(course.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: selectedCourseIds.includes(course.id) ? '#eff6ff' : '#f9f9f9',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selectedCourseIds.includes(course.id) ? '#3b82f6' : '#e5e5e5',
                      }}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        backgroundColor: selectedCourseIds.includes(course.id) ? '#3b82f6' : 'transparent',
                        borderWidth: 2,
                        borderColor: selectedCourseIds.includes(course.id) ? '#3b82f6' : '#d1d5db',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        {selectedCourseIds.includes(course.id) && (
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                            ✓
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: '500',
                          color: selectedCourseIds.includes(course.id) ? '#1e40af' : '#374151'
                        }}>
                          {course.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {course.platform} • {course.term}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                No courses available. Connect a platform first.
              </Text>
            )}

            {selectedCourseIds.length > 0 && (
              <View style={{ 
                marginBottom: 16,
                padding: 12,
                backgroundColor: '#f0f9ff',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#bfdbfe'
              }}>
                <Text style={{ fontSize: 14, color: '#1e40af', fontWeight: '500' }}>
                  {selectedCourseIds.length} course{selectedCourseIds.length > 1 ? 's' : ''} selected
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#3b82f6',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => setShowCourseModal(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: 'white' }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: selectedConnection?.color + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <Text style={{ fontSize: 30 }}>{selectedConnection?.icon}</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 4 }}>
                Connect to {selectedConnection?.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                Enter your credentials to sync your assignments and grades
              </Text>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                {selectedConnection?.id === 'canvas' ? 'API Token' : 'Email'}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#f9f9f9'
                }}
                placeholder={selectedConnection?.id === 'canvas' ? 'Enter your Canvas API token' : 'Enter your email'}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete={selectedConnection?.id === 'canvas' ? 'off' : 'email'}
                keyboardType={selectedConnection?.id === 'canvas' ? 'default' : 'email-address'}
              />
            </View>

            {selectedConnection?.id !== 'canvas' && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                  Password
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#e5e5e5',
                      borderRadius: 8,
                      padding: 12,
                      paddingRight: 50,
                      fontSize: 16,
                      backgroundColor: '#f9f9f9'
                    }}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 12,
                      padding: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: '#666' }}>
                      {showPassword ? '🙈' : '👁️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => setShowLoginModal(false)}
                disabled={isConnecting}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#666' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: selectedConnection?.color || '#3B82F6',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: isConnecting ? 0.6 : 1
                }}
                onPress={handleLoginSubmit}
                disabled={isConnecting}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: 'white' }}>
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gradescope Credentials Modal */}
      <Modal
        visible={showGradescopeCredentialsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGradescopeCredentialsModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#3B82F620',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <Text style={{ fontSize: 30 }}>📊</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 4 }}>
                Gradescope Credentials
              </Text>
              <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                Enter your Gradescope login to fetch real course data
              </Text>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                Email
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#f9f9f9'
                }}
                placeholder="Enter your Gradescope email"
                value={gradescopeEmail}
                onChangeText={setGradescopeEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                Password
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#f9f9f9'
                }}
                placeholder="Enter your Gradescope password"
                value={gradescopePassword}
                onChangeText={setGradescopePassword}
                secureTextEntry={true}
                autoComplete="password"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => {
                  setShowGradescopeCredentialsModal(false);
                  setGradescopeEmail('');
                  setGradescopePassword('');
                }}
                disabled={isConnecting}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#666' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#3B82F6',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: isConnecting ? 0.6 : 1
                }}
                onPress={handleGradescopeCredentialsSubmit}
                disabled={isConnecting}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: 'white' }}>
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WebView proxy disabled - now using server-side API */}
      {/* Server handles all scraping, no need for WebView proxy */}
    </SafeAreaView>
  );
}
