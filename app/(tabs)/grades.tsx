import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFilteredAssignments } from '../../hooks/useOfflineAssignments';
import { useAppStore } from '../../store/useAppStore';
import { useCallback } from 'react';

function getGradeColor(score: number, maxPoints: number) {
  const percentage = (score / maxPoints) * 100;
  if (percentage >= 90) return "#16a34a"; // Green
  if (percentage >= 80) return "#ca8a04"; // Yellow
  if (percentage >= 70) return "#ea580c"; // Orange
  return "#dc2626"; // Red
}

function calculateLetterGrade(score: number, maxPoints: number): string {
  const percentage = (score / maxPoints) * 100;
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

export default function GradesScreen() {
  const { connections, selectedCourseIds } = useAppStore();
  const { assignments, isLoading, isFetching, error, refetch, hasCachedData, stats } = useFilteredAssignments({ isGraded: true });
  const connectedPlatforms = connections.filter(conn => conn.isConnected);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Grades</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
              {hasCachedData ? 'Refreshing grades...' : 'Loading grades...'}
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
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Grades</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#dc2626', marginBottom: 8 }}>
              Error loading grades
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
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Grades</Text>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>
              No platforms connected
            </Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
              Connect your educational platforms in the Profile tab to see your grades
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
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Grades</Text>
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

  // Show empty state when no graded assignments
  if (!assignments || assignments.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Grades</Text>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
            }
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
              <Text style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>
                No graded assignments
              </Text>
              <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                Your graded assignments will appear here once they&apos;re available
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
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Grades</Text>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
          }
        >
          <View style={{ gap: 12 }}>
            {assignments.map((assignment) => {
              const letterGrade = assignment.score && assignment.maxPoints 
                ? calculateLetterGrade(assignment.score, assignment.maxPoints)
                : 'N/A';
              
              const gradeColor = assignment.score && assignment.maxPoints 
                ? getGradeColor(assignment.score, assignment.maxPoints)
                : '#666';

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
                    elevation: 2,
                    gap: 12
                  }}>
                    <View style={{ gap: 8 }}>
                      <Text 
                        style={{ fontSize: 16, fontWeight: '500' }}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {assignment.title}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: '#666' }}>
                          {assignment.courseName || 'Unknown Course'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <Text style={{ fontSize: 15, fontWeight: '500' }}>
                            {assignment.score !== null && assignment.maxPoints !== null
                              ? `${assignment.score}/${assignment.maxPoints}`
                              : 'N/A'
                            }
                          </Text>
                          <Text 
                            style={{ 
                              fontSize: 16, 
                              fontWeight: 'bold',
                              color: gradeColor
                            }}
                          >
                            {letterGrade}
                          </Text>
                        </View>
                      </View>
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