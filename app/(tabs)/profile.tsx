import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, LayoutAnimation, Platform, UIManager, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCourses } from '../../hooks/useCourses';
import { GradescopeLogin } from '../../components/GradescopeLogin';
import { GradescopeWebViewProxy, GradescopeProxyMethods } from '../../components/GradescopeWebViewProxy';
import { setGradescopeProxy, clearGradescopeProxy } from '../../utils/proxyRegistry';

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
  const [showGradescopeLogin, setShowGradescopeLogin] = useState(false);
  const [showGradescopeCredentialsModal, setShowGradescopeCredentialsModal] = useState(false);
  const [gradescopeProxyReady, setGradescopeProxyReady] = useState(false);
  
  const [gradescopeEmail, setGradescopeEmail] = useState('');
  const [gradescopePassword, setGradescopePassword] = useState('');
  
  const gradescopeProxyRef = useRef<GradescopeProxyMethods>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConnected, setShowConnected] = useState(true);
  const [showAvailable, setShowAvailable] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      if (connection.id === 'gradescope') {
        console.log('Opening Gradescope login modal');
        setShowGradescopeLogin(true);
      } else {
        setUsername('');
        setPassword('');
        setShowPassword(false);
        setShowLoginModal(true);
      }
    } catch (error) {
      console.error('Error in handleConnect:', error);
      Alert.alert('Error', 'Failed to open connection dialog');
    }
  };

  const handleGradescopeLoginSuccess = async (loginData: any) => {
    setShowGradescopeLogin(false);
    setIsConnecting(true);
    try {
      console.log('Gradescope login successful:', loginData);
      
      // Show a prompt to get the user's actual credentials for server-based auth
      Alert.alert(
        'Enter Credentials', 
        'To fetch your real courses, please enter your Gradescope credentials. These will be sent securely to our server.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter Credentials',
            onPress: () => {
              // Show a credential input modal
              setShowGradescopeCredentialsModal(true);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Gradescope connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Gradescope';
      Alert.alert('Connection Failed', errorMessage);
      setGradescopeProxyReady(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGradescopeLoginFailure = () => {
    setShowGradescopeLogin(false);
    Alert.alert(
      'Login Failed',
      'Could not extract session information. This can happen if Gradescope uses secure HttpOnly cookies. The session cookie cannot be accessed by the app for security reasons.',
      [{ text: 'OK' }]
    );
  };

  const handleGradescopeCredentialsSubmit = async () => {
    if (!gradescopeEmail.trim() || !gradescopePassword.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsConnecting(true);
    setShowGradescopeCredentialsModal(false);

    try {
      console.log('Connecting Gradescope with server-based credentials...');
      
      setGradescopeProxyReady(true);
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

      Alert.alert('Success', 'Successfully connected to Gradescope via server!');
      
      // Clear form
      setGradescopeEmail('');
      setGradescopePassword('');
      
    } catch (error) {
      console.error('Gradescope server connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Gradescope server';
      Alert.alert('Connection Failed', errorMessage);
      setGradescopeProxyReady(false);
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

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === 'connected') {
      setShowConnected(!showConnected);
    } else if (section === 'available') {
      setShowAvailable(!showAvailable);
    } else if (section === 'privacy') {
      setShowPrivacy(!showPrivacy);
    } else if (section === 'settings') {
      setShowSettings(!showSettings);
    }
  };

  const handleLoginSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', `Please enter both ${selectedConnection?.id === 'canvas' ? 'API token' : 'email'} and password`);
      return;
    }

    setIsConnecting(true);
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await connectPlatform(selectedConnection!.id, {
        username: username.trim(),
        password: password.trim(),
      });
      
      // Clear form
      setUsername('');
      setPassword('');
      setShowPassword(false);
      
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
            title="Pull to refresh courses"
            titleColor="#666"
          />
        }
      >
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>Profile</Text>
          <Text style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Connect your educational platforms to sync assignments and grades
          </Text>

          {/* Connected Services Section */}
          {connectedServices.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <TouchableOpacity 
                onPress={() => toggleSection('connected')}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 1,
                  marginBottom: 12
                }}
              >
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#16a34a'
                    }} />
                    <Text style={{ fontSize: 18, fontWeight: '600' }}>
                      Connected ({connectedServices.length})
                    </Text>
                  </View>
                  <Text style={{ 
                    fontSize: 16, 
                    color: '#666',
                    transform: [{ rotate: showConnected ? '90deg' : '0deg' }]
                  }}>
                    ▶
                  </Text>
                </View>
              </TouchableOpacity>
              
              {showConnected && (
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
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: connection.color + '20',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Text style={{ fontSize: 24 }}>{connection.icon}</Text>
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600' }}>
                            {connection.name}
                          </Text>
                          <View style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 12,
                            backgroundColor: '#16a34a'
                          }}>
                            <Text style={{ 
                              fontSize: 12, 
                              color: 'white',
                              fontWeight: '500'
                            }}>
                              Connected
                            </Text>
                          </View>
                        </View>
                        <Text style={{ 
                          fontSize: 14, 
                          color: '#666', 
                          marginTop: 4,
                          lineHeight: 18
                        }}>
                          {connection.description}
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => handleDisconnect(connection)}
                        style={{
                          backgroundColor: '#fee2e2',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8
                        }}
                      >
                        <Text style={{ 
                          fontSize: 14,
                          color: '#dc2626',
                          fontWeight: '500'
                        }}>
                          Disconnect
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Available Services Section */}
          {availableServices.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <TouchableOpacity 
                onPress={() => toggleSection('available')}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 1,
                  marginBottom: 12
                }}
              >
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#9ca3af'
                    }} />
                    <Text style={{ fontSize: 18, fontWeight: '600' }}>
                      Available to Connect ({availableServices.length})
                    </Text>
                  </View>
                  <Text style={{ 
                    fontSize: 16, 
                    color: '#666',
                    transform: [{ rotate: showAvailable ? '90deg' : '0deg' }]
                  }}>
                    ▶
                  </Text>
                </View>
              </TouchableOpacity>
              
              {showAvailable && (
                <View style={{ gap: 12 }}>
                  {availableServices.map((connection) => (
                    <TouchableOpacity 
                      key={connection.id} 
                      activeOpacity={0.8}
                      onPress={() => handleConnect(connection)}
                    >
                      <View style={{
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
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12
                      }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: connection.color + '20',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          <Text style={{ fontSize: 24 }}>{connection.icon}</Text>
                        </View>
                        
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600' }}>
                            {connection.name}
                          </Text>
                          <Text style={{ 
                            fontSize: 14, 
                            color: '#666', 
                            marginTop: 4,
                            lineHeight: 18
                          }}>
                            {connection.description}
                          </Text>
                        </View>
                        
                        <View style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#e5e5e5',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          <Text style={{ 
                            fontSize: 16,
                            color: '#666'
                          }}>
                            +
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Settings Section */}
          <View style={{ marginTop: 32 }}>
            <TouchableOpacity 
              onPress={() => toggleSection('settings')}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e5e5',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
                marginBottom: showSettings ? 12 : 0
              }}
            >
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>⚙️</Text>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '600' }}>
                      Settings
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                      Configure sync preferences
                    </Text>
                  </View>
                </View>
                <Text style={{ 
                  fontSize: 16, 
                  color: '#666',
                  transform: [{ rotate: showSettings ? '90deg' : '0deg' }]
                }}>
                  ▶
                </Text>
              </View>
            </TouchableOpacity>
            
            {showSettings && (
              <View style={{ padding: 16, backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16 }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#3b82f6' }}>
                    Academic Term
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                    Select which academic term to sync courses and assignments from
                  </Text>
                  
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
                      Season
                    </Text>
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
                  
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
                      Year
                    </Text>
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
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: '#f0f9ff',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#bfdbfe'
                  }}>
                    <Text style={{ fontSize: 14, color: '#1e40af', fontWeight: '500' }}>
                      Current Selection: {selectedTerm}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Only courses and assignments from this term will be synced
                    </Text>
                  </View>
                </View>
                
                {/* Course Selection */}
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e5e5' }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#3b82f6' }}>
                    Course Selection
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                    Select which courses to sync assignments from
                  </Text>
                  
                  {coursesLoading ? (
                    <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>
                      Loading available courses...
                    </Text>
                  ) : availableCourses && availableCourses.length > 0 ? (
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
                  ) : (
                    <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>
                      No courses available. Connect a platform first.
                    </Text>
                  )}
                  
                  {selectedCourseIds.length > 0 && (
                    <View style={{ 
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: '#f0f9ff',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#bfdbfe'
                    }}>
                      <Text style={{ fontSize: 14, color: '#1e40af', fontWeight: '500' }}>
                        {selectedCourseIds.length} course{selectedCourseIds.length > 1 ? 's' : ''} selected
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Only assignments from selected courses will be synced
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={{ marginTop: 16 }}>
            <TouchableOpacity 
              onPress={() => toggleSection('privacy')}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e5e5',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
                marginBottom: showPrivacy ? 12 : 0
              }}
            >
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>🛡️</Text>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '600' }}>
                      Privacy & Security
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                      How we protect your data
                    </Text>
                  </View>
                </View>
                <Text style={{ 
                  fontSize: 16, 
                  color: '#666',
                  transform: [{ rotate: showPrivacy ? '90deg' : '0deg' }]
                }}>
                  ▶
                </Text>
              </View>
            </TouchableOpacity>
            
            {showPrivacy && (
              <View style={{ padding: 16, backgroundColor: '#ffffff', borderRadius: 12 }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#16a34a' }}>
                    Your Data is Secure
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 4 }}>
                    • All credentials are encrypted and stored securely
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 4 }}>
                    • We never store your passwords in plain text
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 4 }}>
                    • Your academic data stays private and is not shared with third parties
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
                    • You can disconnect and delete your data at any time
                  </Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#3b82f6' }}>
                    Data Usage
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 4 }}>
                    • We only access assignments and grades from connected platforms
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 4 }}>
                    • Data is used solely to provide you with organized academic information
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
                    • We do not sell or share your personal information
                  </Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#f59e0b' }}>
                    Your Control
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 4 }}>
                    • You own your data and can export or delete it anytime
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 4 }}>
                    • Each platform connection can be managed independently
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
                    • All data syncing happens with your explicit consent
                  </Text>
                </View>

                <View style={{ 
                  borderTopWidth: 1, 
                  borderTopColor: '#e5e5e5', 
                  paddingTop: 12,
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 13, color: '#9ca3af' }}>
                    Questions? Contact us at privacy@gradeslist.com
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

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
      <Modal
        visible={showGradescopeLogin}
        animationType="slide"
        onRequestClose={() => setShowGradescopeLogin(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <GradescopeLogin onLoginSuccess={handleGradescopeLoginSuccess} onLoginFailure={handleGradescopeLoginFailure} />
          <TouchableOpacity
            style={{ padding: 16, backgroundColor: '#f3f4f6', alignItems: 'center' }}
            onPress={() => setShowGradescopeLogin(false)}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#666' }}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
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
