import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilteredAssignments } from '../../hooks/useOfflineAssignments';
import { useAppStore } from '../../store/useAppStore';
import { useCallback } from 'react';
import { formatDate } from '../../utils/dateUtils';

export default function DueScreen() {
  const { connections, selectedCourseIds } = useAppStore();
  const { assignments, isLoading, isFetching, error, refetch, hasCachedData, stats } = useFilteredAssignments({ isGraded: false });
  const connectedPlatforms = connections.filter(conn => conn.isConnected);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Due Tasks</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
              {hasCachedData ? 'Refreshing assignments...' : 'Loading assignments...'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Due Tasks</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#dc2626', marginBottom: 8 }}>
              Error loading assignments
            </Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 }}>
              {error instanceof Error ? error.message : 'Something went wrong'}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={{
                backgroundColor: '#3B82F6',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '500' }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show empty state when no platforms connected
  if (connectedPlatforms.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Due Tasks</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>
              No platforms connected
            </Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
              Connect your educational platforms in the Profile tab to see your assignments
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show empty state when no courses selected
  if (selectedCourseIds.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Due Tasks</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>
              No courses selected
            </Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
              Select courses to sync in Profile → Settings → Course Selection
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show empty state when no assignments
  if (!assignments || assignments.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Due Tasks</Text>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
            }
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
              <Text style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>
                No assignments due
              </Text>
              <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                Great job! You&apos;re all caught up with your assignments
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Due Tasks</Text>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
          }
        >
          <View style={{ gap: 12 }}>
            {assignments.map((assignment) => {
              // Platform badge info
              const getPlatformBadge = (platform: 'canvas' | 'gradescope') => {
                if (platform === 'canvas') {
                  return { text: 'Canvas', color: '#e11d48', bgColor: '#fef2f2', borderColor: '#fecaca' };
                } else {
                  return { text: 'Gradescope', color: '#2563eb', bgColor: '#eff6ff', borderColor: '#bfdbfe' };
                }
              };

              const badge = getPlatformBadge(assignment.platform);

              return (
                <TouchableOpacity key={assignment.id} activeOpacity={0.8}>
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
                    elevation: 2
                  }}>
                    {/* Header row with title and platform badge */}
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'flex-start', 
                      marginBottom: 8,
                      gap: 12
                    }}>
                      <Text 
                        style={{ 
                          fontSize: 16, 
                          fontWeight: '500',
                          flex: 1,
                          paddingRight: 8
                        }}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {assignment.title}
                      </Text>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: badge.bgColor,
                        borderWidth: 1,
                        borderColor: badge.borderColor,
                        alignItems: 'center'
                      }}>
                        <Text style={{ 
                          fontSize: 10, 
                          fontWeight: '600',
                          color: badge.color,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}>
                          {badge.text}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom row with course and due date */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, color: '#666' }}>
                        {assignment.courseName || 'Unknown Course'}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#dc2626' }}>
                        {assignment.dueDate ? formatDate(assignment.dueDate) : 'No date'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}