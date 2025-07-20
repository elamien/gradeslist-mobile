import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export interface GradescopeProxyMethods {
  fetchCourses: () => Promise<any[]>;
  fetchAssignments: (courseId: string) => Promise<any[]>;
  isLoggedIn: () => Promise<boolean>;
  initialize: () => void;
}

interface GradescopeWebViewProxyProps {
  onReady?: () => void;
  onError?: (error: string) => void;
}

export const GradescopeWebViewProxy = forwardRef<GradescopeProxyMethods, GradescopeWebViewProxyProps>(
  ({ onReady, onError }, ref) => {
    console.log('GradescopeWebViewProxy component created');
    const webviewRef = useRef<WebView>(null);
    const pendingRequests = useRef<Map<string, { resolve: (value: any) => void; reject: (error: any) => void }>>(new Map());

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
      fetchCourses: () => makeApiCall('fetchCourses'),
      fetchAssignments: (courseId: string) => makeApiCall('fetchAssignments', { courseId }),
      isLoggedIn: () => Promise.resolve(true), // Always return true since we verified login
      initialize: () => {
        console.log('Initializing proxy to account page...');
        webviewRef.current?.injectJavaScript(`window.location.href = 'https://www.gradescope.com/account';`);
      },
    }));

    const makeApiCall = (method: string, params?: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        const requestId = `${method}_${Date.now()}_${Math.random()}`;
        pendingRequests.current.set(requestId, { resolve, reject });

        let script = '';
        
        if (method === 'fetchCourses') {
          script = `
            (function() {
              try {
                const requestId = "${requestId}";
                
                // Navigate to account page if not already there
                if (!window.location.pathname.includes('/account')) {
                  window.location.href = '/account';
                  return;
                }
                
                // Extract course information from the account page
                const courses = [];
                
                // Look for course boxes/cards on the page
                const courseElements = document.querySelectorAll('.courseBox, .course-card, [class*="course"]');
                
                courseElements.forEach((el, index) => {
                  try {
                    const nameEl = el.querySelector('.courseBox--name, .course-name, h3, h4') || el.querySelector('a');
                    const termEl = el.querySelector('.term, .semester') || el.closest('[class*="term"], [class*="semester"]');
                    const linkEl = el.querySelector('a') || el;
                    
                    if (nameEl && nameEl.textContent) {
                      const courseName = nameEl.textContent.trim();
                      const courseUrl = linkEl.getAttribute('href') || '';
                      const courseId = courseUrl.split('/').pop() || \`course_\${index}\`;
                      
                      // Try to extract term information
                      let term = 'Unknown Term';
                      if (termEl && termEl.textContent) {
                        term = termEl.textContent.trim();
                      } else {
                        // Look for term in parent elements
                        let parent = el.parentElement;
                        while (parent && !term.includes('2025')) {
                          const termMatch = parent.textContent?.match(/(spring|summer|fall|winter)\\s*2025/i);
                          if (termMatch) {
                            term = termMatch[0];
                            break;
                          }
                          parent = parent.parentElement;
                        }
                      }
                      
                      courses.push({
                        id: courseId,
                        name: courseName,
                        term: term,
                        platform: 'gradescope'
                      });
                    }
                  } catch (e) {
                    console.log('Error parsing course element:', e);
                  }
                });
                
                console.log('Found courses:', courses);
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'apiResponse',
                  requestId: requestId,
                  result: { success: true, data: courses }
                }));
                
              } catch (error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'apiResponse',
                  requestId: "${requestId}",
                  result: { success: false, error: error.message }
                }));
              }
            })();
          `;
        }

        webviewRef.current?.injectJavaScript(script);

        // Set timeout for request
        setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            pendingRequests.current.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, 10000);
      });
    };

    const handleMessage = (event: any) => {
      try {
        if (!event?.nativeEvent?.data) {
          return;
        }
        
        const message = JSON.parse(event.nativeEvent.data);
        console.log('Proxy received message:', message);
        
        if (message.type === 'apiResponse') {
          const { requestId, result } = message;
          const request = pendingRequests.current.get(requestId);
          
          if (request) {
            pendingRequests.current.delete(requestId);
            
            if (result?.success) {
              request.resolve(result.data);
            } else {
              request.reject(new Error(result?.error || 'API call failed'));
            }
          }
        }
      } catch (error) {
        console.error('Error parsing proxy message:', error);
      }
    };

    const handleNavigationStateChange = (navState: any) => {
      console.log('Proxy navigation:', navState.url, 'loading:', navState.loading);
      if (navState.url.includes('/account') && !navState.loading) {
        console.log('Proxy reached account page - calling onReady');
        onReady?.();
      }
    };

    const handleLoadStart = () => {
      console.log('Proxy WebView load started');
    };

    const handleLoadEnd = () => {
      console.log('Proxy WebView load ended');
    };

    const handleError = (error: any) => {
      console.error('Proxy WebView error:', error);
      onError?.('WebView error occurred');
    };

    // Auto-initialize the proxy when component mounts
    useEffect(() => {
      console.log('Proxy component mounted - auto-initializing');
      const timer = setTimeout(() => {
        console.log('Auto-initializing proxy to account page...');
        webviewRef.current?.injectJavaScript(`window.location.href = 'https://www.gradescope.com/account';`);
      }, 1000); // Give WebView time to mount
      
      return () => clearTimeout(timer);
    }, []);

    return (
      <View style={styles.container}>
        <WebView
          ref={webviewRef}
          source={{ uri: 'about:blank' }}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onError={handleError}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          incognito={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          style={styles.webview}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
  },
  webview: {
    width: 1,
    height: 1,
  },
});

GradescopeWebViewProxy.displayName = 'GradescopeWebViewProxy';