import logging
import asyncio
import time
import os
from typing import Dict, Any, Optional
import httpx
import aiohttp
from ..models.agent_models import ToolExecutionContext

logger = logging.getLogger(__name__)

class InfraonApiCaller:
    """Tool for making API calls to the Infraon Infinity Platform"""
    
    def __init__(self):
        self.base_url = os.getenv('INFRAON_BASE_URL', 'https://infraonpoc.sd.everest-ims.com')
        self.username = os.getenv('INFRAON_USERNAME')
        self.password = os.getenv('INFRAON_PASSWORD')
        self.token = None  # Will be populated after login
        self.csrf_token = None # Will be populated after login
        self.timeout = 30
        
        # API endpoints mapping
        self.endpoints = {
            'login': '/ux/auth/login', # Added login endpoint
            'announcements': '/ux/common/announcement/announcements/',
            'tickets': '/ux/helpdesk/tickets/',
            'services': '/ux/common/services/',
            'alerts': '/ux/monitoring/alerts/',
            'dashboards': '/ux/dashboards/',
            'users': '/ux/admin/users/',
            'reports': '/ux/reports/',
        }
        
        logger.info(f"🔗 InfraonApiCaller initialized for user: {self.username}")
    
    async def execute(self, parameters: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        """
        Execute an API call to the Infraon platform
        
        Parameters:
        - endpoint: The API endpoint to call (e.g., 'announcements', 'tickets')
        - method: HTTP method (default: 'GET')
        - params: Query parameters for the request
        - data: Request body data (for POST/PUT requests)
        """
        
        endpoint = parameters.get('endpoint', 'announcements')
        method = parameters.get('method', 'GET').upper()
        query_params = parameters.get('params', {})
        request_data = parameters.get('data', None)
        
        logger.info(f"🌐 Making {method} request to Infraon endpoint: {endpoint}")
        
        try:
            # --- Auto-Login Logic ---
            if not self.token and endpoint != 'login':
                logger.info("🔐 No token found, attempting to log in first...")
                login_success = await self._login()
                if not login_success:
                    raise Exception("Authentication failed. Please check your Infraon credentials.")

            # Get the full endpoint URL
            endpoint_path = self.endpoints.get(endpoint)
            if not endpoint_path:
                raise ValueError(f"Unknown endpoint: {endpoint}. Available endpoints: {list(self.endpoints.keys())}")
            
            full_url = f"{self.base_url}{endpoint_path}"
            
            # Prepare headers
            headers = self._prepare_headers()
            
            # Make the API call
            result = await self._make_request(
                method=method,
                url=full_url,
                headers=headers,
                params=query_params,
                data=request_data
            )
            
            logger.info(f"✅ Infraon API call successful for endpoint: {endpoint}")
            
            return {
                'success': True,
                'endpoint': endpoint,
                'method': method,
                'data': result,
                'message': f"Successfully retrieved data from {endpoint}"
            }
            
        except Exception as e:
            logger.error(f"❌ Infraon API call failed: {str(e)}")
            
            return {
                'success': False,
                'endpoint': endpoint,
                'method': method,
                'error': str(e),
                'message': f"Failed to retrieve data from {endpoint}"
            }
    
    async def _login(self) -> bool:
        """Logs into Infraon to get authentication tokens."""
        if not self.username or not self.password:
            logger.error("Infraon username or password not configured.")
            return False

        login_url = f"{self.base_url}{self.endpoints['login']}"
        login_data = {"username": self.username, "password": self.password}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(login_url, json=login_data, timeout=self.timeout) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.token = data.get('data', {}).get('token')
                        self.csrf_token = response.cookies.get('csrftoken')
                        
                        if self.token:
                            logger.info("✅ Successfully logged into Infraon and retrieved token.")
                            return True
                        else:
                            logger.error(f"❌ Login successful, but no token found in response: {data}")
                            return False
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Infraon login failed with status {response.status}: {error_text}")
                        return False
        except Exception as e:
            logger.error(f"❌ Exception during Infraon login: {str(e)}")
            return False

    def _prepare_headers(self) -> Dict[str, str]:
        """Prepare headers for Infraon API requests"""
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Ultiman-Agent/1.0'
        }
        
        # Add authentication headers
        if self.token:
            headers['Authorization'] = f"Token {self.token}"
        
        if self.csrf_token:
            headers['X-CSRFToken'] = self.csrf_token
        
        return headers
    
    async def _make_request(self, method: str, url: str, headers: Dict[str, str], 
                          params: Optional[Dict[str, Any]] = None,
                          data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make the actual HTTP request to Infraon API"""
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
            
            # Prepare request arguments
            request_args = {
                'url': url,
                'headers': headers,
                'params': params
            }
            
            if data and method in ['POST', 'PUT', 'PATCH']:
                request_args['json'] = data
            
            # Make the request
            async with session.request(method, **request_args) as response:
                
                # Log response details
                logger.info(f"📊 Infraon API Response: {response.status} for {method} {url}")
                
                # Handle different response types
                if response.status == 200:
                    try:
                        response_data = await response.json()
                        return response_data
                    except Exception:
                        # If JSON parsing fails, return text response
                        text_response = await response.text()
                        return {'raw_response': text_response}
                
                elif response.status == 201:
                    # Created response - success for POST requests
                    try:
                        response_data = await response.json()
                        return response_data
                    except Exception:
                        # If JSON parsing fails, return text response
                        text_response = await response.text()
                        return {'raw_response': text_response, 'status': 'created'}
                
                elif response.status == 204:
                    # No content response
                    return {'message': 'Request successful, no content returned'}
                
                elif response.status == 401:
                    raise Exception(f"Authentication failed. Please check your Infraon credentials.")
                
                elif response.status == 403:
                    raise Exception(f"Access forbidden. You may not have permission to access this resource.")
                
                elif response.status == 404:
                    return {'message': f'📢 No data found for {method} request to {url}'}
                
                elif response.status >= 500:
                    raise Exception(f"Infraon server error: {response.status}")
                
                else:
                    # Try to get error details from response
                    try:
                        error_data = await response.json()
                        raise Exception(f"API request failed: {response.status} - {error_data}")
                    except:
                        raise Exception(f"API request failed with status: {response.status}")
    
    async def get_announcements(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Convenience method to get announcements"""
        return await self.execute(
            parameters={'endpoint': 'announcements', 'params': params or {}},
            context=ToolExecutionContext(session_id="direct", user_query="get_announcements")
        )
    
    async def get_tickets(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Convenience method to get tickets"""
        return await self.execute(
            parameters={'endpoint': 'tickets', 'params': params or {}},
            context=ToolExecutionContext(session_id="direct", user_query="get_tickets")
        )
    
    async def get_services(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Convenience method to get services"""
        return await self.execute(
            parameters={'endpoint': 'services', 'params': params or {}},
            context=ToolExecutionContext(session_id="direct", user_query="get_services")
        )
    
    async def get_alerts(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Convenience method to get alerts"""
        return await self.execute(
            parameters={'endpoint': 'alerts', 'params': params or {}},
            context=ToolExecutionContext(session_id="direct", user_query="get_alerts")
        )
    
    def get_available_endpoints(self) -> Dict[str, str]:
        """Get list of available API endpoints"""
        return self.endpoints.copy()
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection to Infraon API"""
        try:
            result = await self.get_announcements()
            return {
                'connection_status': 'success',
                'message': 'Successfully connected to Infraon API',
                'test_result': result
            }
        except Exception as e:
            return {
                'connection_status': 'failed',
                'message': f'Failed to connect to Infraon API: {str(e)}',
                'error': str(e)
            } 