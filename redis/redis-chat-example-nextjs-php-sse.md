Absolutely! Transitioning from WebSockets to **Server-Sent Events (SSE)** for real-time updates is a viable approach, especially for scenarios where you require unidirectional communication from the server to the client. SSE is simpler to implement compared to WebSockets and is well-suited for applications where the server needs to push updates to the client without expecting frequent messages from the client side.

Given your technology stack:

- **Backend:** PHP 7.4 with CodeIgniter 3
- **Frontend:** Next.js 13
- **Real-Time Communication:** Server-Sent Events (SSE)
- **Data Storage:** Redis

Below is a comprehensive, real-world example demonstrating how to implement this architecture.

---

## **Overview of the Implementation**

1. **Backend (CodeIgniter 3):**
   - **Message Sending Endpoint:** An API endpoint (`/chat/send`) that allows clients to send chat messages. This endpoint saves messages to Redis Streams and publishes updates via Redis Pub/Sub.
   - **SSE Endpoint:** An API endpoint (`/chat/stream`) that establishes an SSE connection with clients, listens to Redis Pub/Sub channels, and streams real-time updates to connected clients.

2. **Frontend (Next.js 13):**
   - **Chat Interface:** A component that allows users to send messages and displays incoming messages in real-time by subscribing to the SSE endpoint.

3. **Redis:**
   - **Streams:** Stores chat messages in an ordered and persistent manner.
   - **Pub/Sub:** Facilitates real-time message broadcasting to subscribed SSE clients.

---

## **1. Backend Implementation with CodeIgniter 3**

### **A. Setting Up Redis in CodeIgniter**

#### **1. Install Redis and phpredis Extension**

Ensure Redis is installed and running. If using Docker, refer to the previous Docker Compose setup. Otherwise, install Redis on your system.

**Install Redis on macOS (if not using Docker):**

```bash
brew install redis
brew services start redis
```

**Install phpredis Extension:**

1. **Install via PECL:**

   ```bash
   pecl install redis
   ```

2. **Enable the Extension:**

   Add the following line to your `php.ini` file:

   ```ini
   extension=redis.so
   ```

3. **Verify Installation:**

   ```bash
   php -m | grep redis
   ```

   You should see `redis` in the output.

#### **2. Configure Redis Connection in CodeIgniter**

**Create `application/config/redis.php`:**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$config['redis_host'] = '127.0.0.1';
$config['redis_port'] = 6379;
$config['redis_password'] = 'your_secure_password'; // Set if using AUTH
$config['redis_database'] = 0; // Select the Redis database index
```

**Create `application/libraries/Redis_lib.php`:**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Redis_lib {
    protected $redis;

    public function __construct() {
        $this->CI =& get_instance();
        $this->CI->load->config('redis');

        $this->redis = new Redis();
        $connected = $this->redis->connect($this->CI->config->item('redis_host'), $this->CI->config->item('redis_port'));

        if (!$connected) {
            log_message('error', 'Could not connect to Redis');
            throw new Exception('Could not connect to Redis');
        }

        $password = $this->CI->config->item('redis_password');
        if ($password) {
            $authenticated = $this->redis->auth($password);
            if (!$authenticated) {
                log_message('error', 'Redis authentication failed');
                throw new Exception('Redis authentication failed');
            }
        }

        $database = $this->CI->config->item('redis_database');
        $this->redis->select($database);
    }

    public function getRedis() {
        return $this->redis;
    }
}
```

**Autoload the Redis Library:**

**Edit `application/config/autoload.php`:**

```php
$autoload['libraries'] = array('database', 'redis_lib');
```

### **B. Creating the Chat Controller**

**Create `application/controllers/Chat.php`:**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Chat extends CI_Controller {

    public function __construct() {
        parent::__construct();
        // Ensure Redis is loaded
        $this->load->library('redis_lib');
    }

    /**
     * Send a new chat message
     * POST /chat/send
     * Parameters: ticket_id, sender_id, message
     */
    public function send() {
        // Allow CORS (if frontend is on a different domain/port)
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");

        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }

        // Get POST data
        $ticket_id = $this->input->post('ticket_id');
        $sender_id = $this->input->post('sender_id');
        $message = $this->input->post('message');

        // Validate input
        if (!$ticket_id || !$sender_id || !$message) {
            $this->output
                ->set_status_header(400)
                ->set_content_type('application/json')
                ->set_output(json_encode(['error' => 'Missing parameters']));
            return;
        }

        try {
            $redis = $this->redis_lib->getRedis();

            // Define the Redis Stream key
            $stream_key = "chat:{$ticket_id}";

            // Add the message to the Redis Stream
            $message_id = $redis->xAdd($stream_key, '*', [
                'sender_id' => $sender_id,
                'message' => $message,
                'timestamp' => time()
            ]);

            // Publish the message ID to a Pub/Sub channel
            $channel = "channel:chat:{$ticket_id}";
            $redis->publish($channel, $message_id);

            // Respond with success
            $this->output
                ->set_status_header(200)
                ->set_content_type('application/json')
                ->set_output(json_encode(['status' => 'success', 'message_id' => $message_id]));
        } catch (Exception $e) {
            log_message('error', 'Error sending message: ' . $e->getMessage());
            $this->output
                ->set_status_header(500)
                ->set_content_type('application/json')
                ->set_output(json_encode(['error' => 'Internal Server Error']));
        }
    }

    /**
     * SSE endpoint to stream real-time chat messages
     * GET /chat/stream?ticket_id=12345
     */
    public function stream() {
        // Allow CORS
        header("Access-Control-Allow-Origin: *");
        header("Content-Type: text/event-stream");
        header("Cache-Control: no-cache");
        header("Connection: keep-alive");

        // Get ticket_id from GET parameters
        $ticket_id = $this->input->get('ticket_id');

        if (!$ticket_id) {
            echo "data: {\"error\": \"Missing ticket_id\"}\n\n";
            flush();
            return;
        }

        try {
            $redis = $this->redis_lib->getRedis();
            $channel = "channel:chat:{$ticket_id}";

            // Subscribe to the Pub/Sub channel
            $pubsub = $redis->pubSubLoop();
            $pubsub->subscribe($channel);

            foreach ($pubsub as $message) {
                if ($message->kind === 'message') {
                    $message_id = $message->payload;

                    // Retrieve the message from the Redis Stream
                    $stream_key = "chat:{$ticket_id}";
                    $stream_message = $redis->xRange($stream_key, $message_id, $message_id);

                    if (!empty($stream_message)) {
                        $msg = $stream_message[0];
                        $data = [
                            'ticket_id' => $ticket_id,
                            'message_id' => $message_id,
                            'sender_id' => $msg['sender_id'],
                            'message' => $msg['message'],
                            'timestamp' => $msg['timestamp']
                        ];

                        // Send the message as an SSE event
                        echo "data: " . json_encode($data) . "\n\n";
                        flush();
                    }
                }
            }

            // Close the Pub/Sub loop
            unset($pubsub);
        } catch (Exception $e) {
            // Send error as SSE event
            echo "data: {\"error\": \"Internal Server Error\"}\n\n";
            flush();
            log_message('error', 'Error in SSE stream: ' . $e->getMessage());
        }
    }
}
```

### **C. Defining Routes**

**Edit `application/config/routes.php`:**

```php
$route['chat/send'] = 'chat/send';
$route['chat/stream'] = 'chat/stream';
```

### **D. Handling SSE in PHP with CodeIgniter 3**

PHP is inherently synchronous and does not support asynchronous operations out-of-the-box. Implementing SSE in a synchronous environment can lead to scalability issues, as each SSE connection may consume significant server resources. However, for a simple or low-traffic application, this approach can be acceptable.

**Considerations:**

1. **Server Configuration:**
   - **Timeouts:** Ensure that the PHP and web server (e.g., Apache, Nginx) configurations allow for long-running scripts without timing out.
   - **Buffering:** Disable output buffering to ensure immediate transmission of events.

2. **Scalability:**
   - For higher traffic, consider using a dedicated SSE server or integrating with a more scalable solution.

3. **Efficiency:**
   - Optimize the SSE endpoint to handle multiple connections efficiently, possibly by implementing a minimal event loop or using multi-threading (advanced).

---

## **2. Frontend Implementation with Next.js 13**

### **A. Setting Up the Next.js Project**

If you haven't already set up a Next.js project, you can create one using the following commands:

```bash
npx create-next-app@latest chat-app
cd chat-app
```

### **B. Creating the Chat Component**

**Create `components/ChatBox.js`:**

```javascript
import { useEffect, useState } from 'react';

const ChatBox = ({ ticketId, senderId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [eventSource, setEventSource] = useState(null);

    useEffect(() => {
        // Establish SSE connection
        const es = new EventSource(`/api/chat-stream?ticket_id=${ticketId}`);

        es.onopen = () => {
            console.log('SSE connection established');
        };

        es.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                console.error('SSE error:', data.error);
                return;
            }

            setMessages((prevMessages) => [...prevMessages, data]);
        };

        es.onerror = (err) => {
            console.error('SSE connection error:', err);
            es.close();
        };

        setEventSource(es);

        return () => {
            es.close();
        };
    }, [ticketId]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        try {
            const response = await fetch('/api/chat-send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    sender_id: senderId,
                    message: input,
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setInput('');
                // Optionally, append the message locally
                // setMessages([...messages, { ...data.message, sender_id: senderId }]);
            } else {
                console.error('Failed to send message:', data.error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div>
            <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'scroll', padding: '10px' }}>
                {messages.map((msg) => (
                    <div key={msg.message_id}>
                        <strong>User {msg.sender_id}:</strong> {msg.message} <em>({new Date(msg.timestamp * 1000).toLocaleTimeString()})</em>
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage();
                }}
                style={{ width: '80%', padding: '10px' }}
            />
            <button onClick={sendMessage} style={{ padding: '10px' }}>Send</button>
        </div>
    );
};

export default ChatBox;
```

### **C. Creating API Routes for Proxying Requests**

To facilitate communication between Next.js and the CodeIgniter backend, we'll create API routes in Next.js that proxy the requests to the CodeIgniter server.

**1. Create `pages/api/chat-send.js`:**

```javascript
export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const response = await fetch('http://localhost/chat/send', { // Adjust the URL as needed
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req.body),
            });

            const data = await response.json();

            res.status(response.status).json(data);
        } catch (error) {
            console.error('Error proxying message:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
```

**2. Create `pages/api/chat-stream.js`:**

SSE requires a persistent connection. Next.js API routes are not ideal for long-lived connections, but for simplicity, we'll implement it here. For production-grade applications, consider using a separate server or serverless functions optimized for SSE.

```javascript
export default function handler(req, res) {
    const { ticket_id } = req.query;

    if (!ticket_id) {
        res.status(400).json({ error: 'Missing ticket_id' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders(); // flush the headers to establish SSE with client

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res,
    };

    // Store the client
    if (!res.socket.server.clients) {
        res.socket.server.clients = [];
    }
    res.socket.server.clients.push(newClient);
    console.log(`Client ${clientId} connected. Total clients: ${res.socket.server.clients.length}`);

    // Send a welcome message
    res.write(`data: ${JSON.stringify({ message: 'Connected to SSE stream' })}\n\n`);

    // Setup a Redis Pub/Sub connection
    const redis = require('redis');
    const subscriber = redis.createClient({
        host: '127.0.0.1',
        port: 6379,
        password: 'your_secure_password', // Set if using AUTH
    });

    subscriber.on('error', (err) => {
        console.error('Redis subscriber error:', err);
    });

    subscriber.subscribe(`channel:chat:${ticket_id}`, (err, count) => {
        if (err) {
            console.error('Failed to subscribe:', err);
            return;
        }
        console.log(`Subscribed to channel:chat:${ticket_id}`);
    });

    subscriber.on('message', (channel, message) => {
        // Send the message to the client
        res.write(`data: ${JSON.stringify({ message_id: message })}\n\n`);
    });

    // Remove client on close
    req.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        res.socket.server.clients = res.socket.server.clients.filter(c => c.id !== clientId);
        subscriber.quit();
    });
}
```

**Important Notes:**

1. **Persistent Connections:** Next.js API routes are not optimized for persistent connections like SSE. This implementation works for development or low-traffic scenarios. For production, consider using a dedicated SSE server or integrating with services designed for real-time data streaming.

2. **Redis Connection:** Ensure that the Redis client in the SSE endpoint matches the configuration in your CodeIgniter setup.

3. **Client Management:** This simple implementation doesn't handle multiple clients efficiently. For multiple clients subscribed to the same `ticket_id`, consider optimizing the client storage and message broadcasting.

### **D. Integrate the Chat Component into a Page**

**Create `pages/ticket/[id].js`:**

```javascript
import { useRouter } from 'next/router';
import ChatBox from '../../components/ChatBox';

const TicketPage = () => {
    const router = useRouter();
    const { id } = router.query; // ticket ID
    const senderId = 1; // Replace with actual user ID from authentication

    if (!id) return <div>Loading...</div>;

    return (
        <div>
            <h1>Ticket #{id}</h1>
            <ChatBox ticketId={id} senderId={senderId} />
        </div>
    );
};

export default TicketPage;
```

---

## **3. Finalizing the Setup**

### **A. Running the CodeIgniter Backend**

1. **Ensure Redis is Running:**

   If using Docker, ensure your Redis container is up. If installed locally, start Redis:

   ```bash
   brew services start redis
   ```

2. **Start the CodeIgniter Server:**

   Depending on your setup, you might use Apache, Nginx, or PHP's built-in server.

   **Using PHP's Built-in Server (for Development):**

   ```bash
   php -S localhost:80 -t /path/to/your/codeigniter/project
   ```

### **B. Running the Next.js Frontend**

1. **Install Dependencies:**

   Navigate to your Next.js project directory and install dependencies:

   ```bash
   cd chat-app
   npm install
   ```

2. **Start the Development Server:**

   ```bash
   npm run dev
   ```

   The frontend should now be accessible at `http://localhost:3000`.

### **C. Testing the Chat System**

1. **Open Multiple Browser Tabs:**

   - Open `http://localhost:3000/ticket/12345` in multiple tabs or different browsers to simulate multiple users.

2. **Send Messages:**

   - Type a message in one tab and send it.
   - Observe the message appearing in real-time across all connected tabs.

3. **Verify Redis Streams and Pub/Sub:**

   - **View Stream Messages:**

     ```bash
     redis-cli XREAD COUNT 10 STREAMS chat:12345 0
     ```

   - **Subscribe to Pub/Sub Channel:**

     ```bash
     redis-cli
     SUBSCRIBE channel:chat:12345
     ```

     You should see message IDs being published when new messages are sent.

---

## **4. Enhancements and Best Practices**

### **A. Handling Multiple Clients and Scalability**

The current SSE implementation in Next.js handles individual client connections but isn't optimized for high scalability. Consider the following enhancements:

1. **Shared Redis Subscription:**

   Modify the SSE endpoint to manage multiple clients subscribed to the same `ticket_id` efficiently by sharing a single Redis Pub/Sub subscription.

2. **Use a Dedicated SSE Server:**

   For better scalability and performance, implement SSE in a separate service optimized for handling long-lived connections.

### **B. Implementing Authentication and Authorization**

1. **Secure API Endpoints:**

   - Implement authentication tokens (e.g., JWT) to secure the `/chat/send` API endpoint.
   - Validate tokens in the CodeIgniter controller before processing messages.

2. **Secure SSE Connections:**

   - Pass authentication tokens when establishing SSE connections.
   - Validate tokens in the SSE endpoint before subscribing to Redis channels.

### **C. Optimizing Redis Usage**

1. **Message Retention:**

   - Implement policies to retain only recent messages or archive old messages to prevent excessive memory usage.

2. **Efficient Data Structures:**

   - Regularly review and optimize your Redis data structures for performance and memory efficiency.

### **D. Monitoring and Logging**

1. **Monitor Redis Performance:**

   - Use tools like **Prometheus** and **Grafana** to monitor Redis metrics and set up alerts for critical events.

2. **Log SSE Events:**

   - Implement comprehensive logging in your SSE endpoint to track connections, disconnections, and message broadcasts.

### **E. Error Handling and Resilience**

1. **Implement Retry Mechanisms:**

   - Ensure that your frontend gracefully handles temporary network issues or Redis downtimes by implementing retry logic.

2. **Graceful Shutdowns:**

   - Handle server shutdowns gracefully to prevent message loss and ensure clients are properly disconnected.

---

## **5. Complete Code Summary**

### **A. Backend: CodeIgniter 3**

#### **1. Redis Configuration (`application/config/redis.php`):**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$config['redis_host'] = '127.0.0.1';
$config['redis_port'] = 6379;
$config['redis_password'] = 'your_secure_password'; // Set if using AUTH
$config['redis_database'] = 0; // Select the Redis database index
```

#### **2. Redis Library (`application/libraries/Redis_lib.php`):**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Redis_lib {
    protected $redis;

    public function __construct() {
        $this->CI =& get_instance();
        $this->CI->load->config('redis');

        $this->redis = new Redis();
        $connected = $this->redis->connect($this->CI->config->item('redis_host'), $this->CI->config->item('redis_port'));

        if (!$connected) {
            log_message('error', 'Could not connect to Redis');
            throw new Exception('Could not connect to Redis');
        }

        $password = $this->CI->config->item('redis_password');
        if ($password) {
            $authenticated = $this->redis->auth($password);
            if (!$authenticated) {
                log_message('error', 'Redis authentication failed');
                throw new Exception('Redis authentication failed');
            }
        }

        $database = $this->CI->config->item('redis_database');
        $this->redis->select($database);
    }

    public function getRedis() {
        return $this->redis;
    }
}
```

#### **3. Autoloading the Redis Library (`application/config/autoload.php`):**

```php
$autoload['libraries'] = array('database', 'redis_lib');
```

#### **4. Chat Controller (`application/controllers/Chat.php`):**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Chat extends CI_Controller {

    public function __construct() {
        parent::__construct();
        // Ensure Redis is loaded
        $this->load->library('redis_lib');
    }

    /**
     * Send a new chat message
     * POST /chat/send
     * Parameters: ticket_id, sender_id, message
     */
    public function send() {
        // Allow CORS (if frontend is on a different domain/port)
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");

        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }

        // Get POST data
        $ticket_id = $this->input->post('ticket_id');
        $sender_id = $this->input->post('sender_id');
        $message = $this->input->post('message');

        // Validate input
        if (!$ticket_id || !$sender_id || !$message) {
            $this->output
                ->set_status_header(400)
                ->set_content_type('application/json')
                ->set_output(json_encode(['error' => 'Missing parameters']));
            return;
        }

        try {
            $redis = $this->redis_lib->getRedis();

            // Define the Redis Stream key
            $stream_key = "chat:{$ticket_id}";

            // Add the message to the Redis Stream
            $message_id = $redis->xAdd($stream_key, '*', [
                'sender_id' => $sender_id,
                'message' => $message,
                'timestamp' => time()
            ]);

            // Publish the message ID to a Pub/Sub channel
            $channel = "channel:chat:{$ticket_id}";
            $redis->publish($channel, $message_id);

            // Respond with success
            $this->output
                ->set_status_header(200)
                ->set_content_type('application/json')
                ->set_output(json_encode(['status' => 'success', 'message_id' => $message_id]));
        } catch (Exception $e) {
            log_message('error', 'Error sending message: ' . $e->getMessage());
            $this->output
                ->set_status_header(500)
                ->set_content_type('application/json')
                ->set_output(json_encode(['error' => 'Internal Server Error']));
        }
    }

    /**
     * SSE endpoint to stream real-time chat messages
     * GET /chat/stream?ticket_id=12345
     */
    public function stream() {
        // Allow CORS
        header("Access-Control-Allow-Origin: *");
        header("Content-Type: text/event-stream");
        header("Cache-Control: no-cache");
        header("Connection: keep-alive");

        // Get ticket_id from GET parameters
        $ticket_id = $this->input->get('ticket_id');

        if (!$ticket_id) {
            echo "data: {\"error\": \"Missing ticket_id\"}\n\n";
            flush();
            return;
        }

        try {
            $redis = $this->redis_lib->getRedis();
            $channel = "channel:chat:{$ticket_id}";

            // Subscribe to the Pub/Sub channel
            $pubsub = $redis->pubSubLoop();
            $pubsub->subscribe($channel);

            foreach ($pubsub as $message) {
                if ($message->kind === 'message') {
                    $message_id = $message->payload;

                    // Retrieve the message from the Redis Stream
                    $stream_key = "chat:{$ticket_id}";
                    $stream_message = $redis->xRange($stream_key, $message_id, $message_id);

                    if (!empty($stream_message)) {
                        $msg = $stream_message[0];
                        $data = [
                            'ticket_id' => $ticket_id,
                            'message_id' => $message_id,
                            'sender_id' => $msg['sender_id'],
                            'message' => $msg['message'],
                            'timestamp' => $msg['timestamp']
                        ];

                        // Send the message as an SSE event
                        echo "data: " . json_encode($data) . "\n\n";
                        flush();
                    }
                }
            }

            // Close the Pub/Sub loop
            unset($pubsub);
        } catch (Exception $e) {
            // Send error as SSE event
            echo "data: {\"error\": \"Internal Server Error\"}\n\n";
            flush();
            log_message('error', 'Error in SSE stream: ' . $e->getMessage());
        }
    }
}
```

### **5. Defining Routes**

**Edit `application/config/routes.php`:**

```php
$route['chat/send'] = 'chat/send';
$route['chat/stream'] = 'chat/stream';
```

---

## **4. Frontend Implementation with Next.js 13**

### **A. Setting Up the Next.js Project**

If you haven't already set up a Next.js project, you can create one using the following commands:

```bash
npx create-next-app@latest chat-app
cd chat-app
```

### **B. Creating the Chat Component**

**Create `components/ChatBox.js`:**

```javascript
import { useEffect, useState } from 'react';

const ChatBox = ({ ticketId, senderId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [eventSource, setEventSource] = useState(null);

    useEffect(() => {
        // Establish SSE connection
        const es = new EventSource(`/api/chat-stream?ticket_id=${ticketId}`);

        es.onopen = () => {
            console.log('SSE connection established');
        };

        es.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                console.error('SSE error:', data.error);
                return;
            }

            setMessages((prevMessages) => [...prevMessages, data]);
        };

        es.onerror = (err) => {
            console.error('SSE connection error:', err);
            es.close();
        };

        setEventSource(es);

        return () => {
            es.close();
        };
    }, [ticketId]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        try {
            const response = await fetch('/api/chat-send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    sender_id: senderId,
                    message: input,
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setInput('');
                // Optionally, append the message locally
                // setMessages([...messages, { ...data.message, sender_id: senderId }]);
            } else {
                console.error('Failed to send message:', data.error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div>
            <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'scroll', padding: '10px' }}>
                {messages.map((msg) => (
                    <div key={msg.message_id}>
                        <strong>User {msg.sender_id}:</strong> {msg.message} <em>({new Date(msg.timestamp * 1000).toLocaleTimeString()})</em>
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage();
                }}
                style={{ width: '80%', padding: '10px' }}
            />
            <button onClick={sendMessage} style={{ padding: '10px' }}>Send</button>
        </div>
    );
};

export default ChatBox;
```

### **C. Creating API Routes for Proxying Requests**

To facilitate communication between Next.js and the CodeIgniter backend, we'll create API routes in Next.js that proxy the requests to the CodeIgniter server.

**1. Create `pages/api/chat-send.js`:**

```javascript
export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const response = await fetch('http://localhost/chat/send', { // Adjust the URL as needed
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req.body),
            });

            const data = await response.json();

            res.status(response.status).json(data);
        } catch (error) {
            console.error('Error proxying message:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
```

**2. Create `pages/api/chat-stream.js`:**

Implementing SSE in Next.js API routes requires handling streaming responses. Below is a basic implementation:

```javascript
export default async function handler(req, res) {
    const { ticket_id } = req.query;

    if (!ticket_id) {
        res.status(400).json({ error: 'Missing ticket_id' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders(); // flush the headers to establish SSE with client

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res,
    };

    // Store the client
    if (!res.socket.server.clients) {
        res.socket.server.clients = [];
    }
    res.socket.server.clients.push(newClient);
    console.log(`Client ${clientId} connected. Total clients: ${res.socket.server.clients.length}`);

    // Send a welcome message
    res.write(`data: ${JSON.stringify({ message: 'Connected to SSE stream' })}\n\n`);

    // Setup a Redis Pub/Sub connection
    const redis = require('redis');
    const subscriber = redis.createClient({
        host: '127.0.0.1',
        port: 6379,
        password: 'your_secure_password', // Set if using AUTH
    });

    subscriber.on('error', (err) => {
        console.error('Redis subscriber error:', err);
    });

    subscriber.subscribe(`channel:chat:${ticket_id}`, (err, count) => {
        if (err) {
            console.error('Failed to subscribe:', err);
            return;
        }
        console.log(`Subscribed to channel:chat:${ticket_id}`);
    });

    subscriber.on('message', (channel, message) => {
        // Send the message to the client
        res.write(`data: ${JSON.stringify({ message_id: message })}\n\n`);
    });

    // Remove client on close
    req.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        res.socket.server.clients = res.socket.server.clients.filter(c => c.id !== clientId);
        subscriber.quit();
    });
}
```

**Important Notes:**

1. **Persistent Connections:** Next.js API routes are not optimized for long-lived connections like SSE. This implementation works for development or low-traffic scenarios. For production-grade applications, consider using a dedicated SSE server or services optimized for real-time data streaming.

2. **Redis Connection:** Ensure that the Redis client in the SSE endpoint matches the configuration in your CodeIgniter setup.

3. **Client Management:** This simple implementation doesn't handle multiple clients efficiently. For multiple clients subscribed to the same `ticket_id`, consider optimizing the client storage and message broadcasting.

### **D. Integrate the Chat Component into a Page**

**Create `pages/ticket/[id].js`:**

```javascript
import { useRouter } from 'next/router';
import ChatBox from '../../components/ChatBox';

const TicketPage = () => {
    const router = useRouter();
    const { id } = router.query; // ticket ID
    const senderId = 1; // Replace with actual user ID from authentication

    if (!id) return <div>Loading...</div>;

    return (
        <div>
            <h1>Ticket #{id}</h1>
            <ChatBox ticketId={id} senderId={senderId} />
        </div>
    );
};

export default TicketPage;
```

---

## **5. Finalizing the Setup**

### **A. Running the CodeIgniter Backend**

1. **Ensure Redis is Running:**

   If using Docker, ensure your Redis container is up. If installed locally, start Redis:

   ```bash
   brew services start redis
   ```

2. **Start the CodeIgniter Server:**

   Depending on your setup, you might use Apache, Nginx, or PHP's built-in server.

   **Using PHP's Built-in Server (for Development):**

   ```bash
   php -S localhost:80 -t /path/to/your/codeigniter/project
   ```

### **B. Running the Next.js Frontend**

1. **Install Dependencies:**

   Navigate to your Next.js project directory and install dependencies:

   ```bash
   cd chat-app
   npm install
   ```

2. **Start the Development Server:**

   ```bash
   npm run dev
   ```

   The frontend should now be accessible at `http://localhost:3000`.

### **C. Testing the Chat System**

1. **Open Multiple Browser Tabs:**

   - Open `http://localhost:3000/ticket/12345` in multiple tabs or different browsers to simulate multiple users.

2. **Send Messages:**

   - Type a message in one tab and send it.
   - Observe the message appearing in real-time across all connected tabs.

3. **Verify Redis Streams and Pub/Sub:**

   - **View Stream Messages:**

     ```bash
     redis-cli XREAD COUNT 10 STREAMS chat:12345 0
     ```

   - **Subscribe to Pub/Sub Channel:**

     ```bash
     redis-cli
     SUBSCRIBE channel:chat:12345
     ```

     You should see message IDs being published when new messages are sent.

---

## **6. Enhancements and Best Practices**

### **A. Handling Multiple Clients and Scalability**

The current SSE implementation in Next.js handles individual client connections but isn't optimized for high scalability. Consider the following enhancements:

1. **Shared Redis Subscription:**

   Modify the SSE endpoint to manage multiple clients subscribed to the same `ticket_id` efficiently by sharing a single Redis Pub/Sub subscription.

2. **Use a Dedicated SSE Server:**

   For better scalability and performance, implement SSE in a separate service optimized for handling long-lived connections.

### **B. Implementing Authentication and Authorization**

1. **Secure API Endpoints:**

   - Implement authentication tokens (e.g., JWT) to secure the `/chat/send` API endpoint.
   - Validate tokens in the CodeIgniter controller before processing messages.

2. **Secure SSE Connections:**

   - Pass authentication tokens when establishing SSE connections.
   - Validate tokens in the SSE endpoint before subscribing to Redis channels.

### **C. Optimizing Redis Usage**

1. **Message Retention:**

   - Implement policies to retain only recent messages or archive old messages to prevent excessive memory usage.

2. **Efficient Data Structures:**

   - Regularly review and optimize your Redis data structures for performance and memory efficiency.

### **D. Monitoring and Logging**

1. **Monitor Redis Performance:**

   - Use tools like **Prometheus** and **Grafana** to monitor Redis metrics and set up alerts for critical events.

2. **Log SSE Events:**

   - Implement comprehensive logging in your SSE endpoint to track connections, disconnections, and message broadcasts.

### **E. Error Handling and Resilience**

1. **Implement Retry Mechanisms:**

   - Ensure that your frontend gracefully handles temporary network issues or Redis downtimes by implementing retry logic.

2. **Graceful Shutdowns:**

   - Handle server shutdowns gracefully to prevent message loss and ensure clients are properly disconnected.

---

## **7. Complete Code Summary**

### **A. Backend: CodeIgniter 3**

#### **1. Redis Configuration (`application/config/redis.php`):**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$config['redis_host'] = '127.0.0.1';
$config['redis_port'] = 6379;
$config['redis_password'] = 'your_secure_password'; // Set if using AUTH
$config['redis_database'] = 0; // Select the Redis database index
```

#### **2. Redis Library (`application/libraries/Redis_lib.php`):**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Redis_lib {
    protected $redis;

    public function __construct() {
        $this->CI =& get_instance();
        $this->CI->load->config('redis');

        $this->redis = new Redis();
        $connected = $this->redis->connect($this->CI->config->item('redis_host'), $this->CI->config->item('redis_port'));

        if (!$connected) {
            log_message('error', 'Could not connect to Redis');
            throw new Exception('Could not connect to Redis');
        }

        $password = $this->CI->config->item('redis_password');
        if ($password) {
            $authenticated = $this->redis->auth($password);
            if (!$authenticated) {
                log_message('error', 'Redis authentication failed');
                throw new Exception('Redis authentication failed');
            }
        }

        $database = $this->CI->config->item('redis_database');
        $this->redis->select($database);
    }

    public function getRedis() {
        return $this->redis;
    }
}
```

#### **3. Autoloading the Redis Library (`application/config/autoload.php`):**

```php
$autoload['libraries'] = array('database', 'redis_lib');
```

#### **4. Chat Controller (`application/controllers/Chat.php`):**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Chat extends CI_Controller {

    public function __construct() {
        parent::__construct();
        // Ensure Redis is loaded
        $this->load->library('redis_lib');
    }

    /**
     * Send a new chat message
     * POST /chat/send
     * Parameters: ticket_id, sender_id, message
     */
    public function send() {
        // Allow CORS (if frontend is on a different domain/port)
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");

        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }

        // Get POST data
        $ticket_id = $this->input->post('ticket_id');
        $sender_id = $this->input->post('sender_id');
        $message = $this->input->post('message');

        // Validate input
        if (!$ticket_id || !$sender_id || !$message) {
            $this->output
                ->set_status_header(400)
                ->set_content_type('application/json')
                ->set_output(json_encode(['error' => 'Missing parameters']));
            return;
        }

        try {
            $redis = $this->redis_lib->getRedis();

            // Define the Redis Stream key
            $stream_key = "chat:{$ticket_id}";

            // Add the message to the Redis Stream
            $message_id = $redis->xAdd($stream_key, '*', [
                'sender_id' => $sender_id,
                'message' => $message,
                'timestamp' => time()
            ]);

            // Publish the message ID to a Pub/Sub channel
            $channel = "channel:chat:{$ticket_id}";
            $redis->publish($channel, $message_id);

            // Respond with success
            $this->output
                ->set_status_header(200)
                ->set_content_type('application/json')
                ->set_output(json_encode(['status' => 'success', 'message_id' => $message_id]));
        } catch (Exception $e) {
            log_message('error', 'Error sending message: ' . $e->getMessage());
            $this->output
                ->set_status_header(500)
                ->set_content_type('application/json')
                ->set_output(json_encode(['error' => 'Internal Server Error']));
        }
    }

    /**
     * SSE endpoint to stream real-time chat messages
     * GET /chat/stream?ticket_id=12345
     */
    public function stream() {
        // Allow CORS
        header("Access-Control-Allow-Origin: *");
        header("Content-Type: text/event-stream");
        header("Cache-Control: no-cache");
        header("Connection: keep-alive");

        // Get ticket_id from GET parameters
        $ticket_id = $this->input->get('ticket_id');

        if (!$ticket_id) {
            echo "data: {\"error\": \"Missing ticket_id\"}\n\n";
            flush();
            return;
        }

        try {
            $redis = $this->redis_lib->getRedis();
            $channel = "channel:chat:{$ticket_id}";

            // Subscribe to the Pub/Sub channel
            $pubsub = $redis->pubSubLoop();
            $pubsub->subscribe($channel);

            foreach ($pubsub as $message) {
                if ($message->kind === 'message') {
                    $message_id = $message->payload;

                    // Retrieve the message from the Redis Stream
                    $stream_key = "chat:{$ticket_id}";
                    $stream_message = $redis->xRange($stream_key, $message_id, $message_id);

                    if (!empty($stream_message)) {
                        $msg = $stream_message[0];
                        $data = [
                            'ticket_id' => $ticket_id,
                            'message_id' => $message_id,
                            'sender_id' => $msg['sender_id'],
                            'message' => $msg['message'],
                            'timestamp' => $msg['timestamp']
                        ];

                        // Send the message as an SSE event
                        echo "data: " . json_encode($data) . "\n\n";
                        flush();
                    }
                }
            }

            // Close the Pub/Sub loop
            unset($pubsub);
        } catch (Exception $e) {
            // Send error as SSE event
            echo "data: {\"error\": \"Internal Server Error\"}\n\n";
            flush();
            log_message('error', 'Error in SSE stream: ' . $e->getMessage());
        }
    }
}
```

### **6. Frontend: Next.js 13**

#### **A. Creating the Chat Component**

**Create `components/ChatBox.js`:**

```javascript
import { useEffect, useState } from 'react';

const ChatBox = ({ ticketId, senderId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [eventSource, setEventSource] = useState(null);

    useEffect(() => {
        // Establish SSE connection
        const es = new EventSource(`/api/chat-stream?ticket_id=${ticketId}`);

        es.onopen = () => {
            console.log('SSE connection established');
        };

        es.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                console.error('SSE error:', data.error);
                return;
            }

            setMessages((prevMessages) => [...prevMessages, data]);
        };

        es.onerror = (err) => {
            console.error('SSE connection error:', err);
            es.close();
        };

        setEventSource(es);

        return () => {
            es.close();
        };
    }, [ticketId]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        try {
            const response = await fetch('/api/chat-send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    sender_id: senderId,
                    message: input,
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setInput('');
                // Optionally, append the message locally
                // setMessages([...messages, { ...data.message, sender_id: senderId }]);
            } else {
                console.error('Failed to send message:', data.error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div>
            <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'scroll', padding: '10px' }}>
                {messages.map((msg) => (
                    <div key={msg.message_id}>
                        <strong>User {msg.sender_id}:</strong> {msg.message} <em>({new Date(msg.timestamp * 1000).toLocaleTimeString()})</em>
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage();
                }}
                style={{ width: '80%', padding: '10px' }}
            />
            <button onClick={sendMessage} style={{ padding: '10px' }}>Send</button>
        </div>
    );
};

export default ChatBox;
```

#### **B. Creating API Routes for Proxying Requests**

**1. Create `pages/api/chat-send.js`:**

```javascript
export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const response = await fetch('http://localhost/chat/send', { // Adjust the URL as needed
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req.body),
            });

            const data = await response.json();

            res.status(response.status).json(data);
        } catch (error) {
            console.error('Error proxying message:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
```

**2. Create `pages/api/chat-stream.js`:**

Implementing SSE in Next.js API routes requires handling streaming responses. Below is a basic implementation:

```javascript
export default function handler(req, res) {
    const { ticket_id } = req.query;

    if (!ticket_id) {
        res.status(400).json({ error: 'Missing ticket_id' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders(); // flush the headers to establish SSE with client

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res,
    };

    // Store the client
    if (!res.socket.server.clients) {
        res.socket.server.clients = [];
    }
    res.socket.server.clients.push(newClient);
    console.log(`Client ${clientId} connected. Total clients: ${res.socket.server.clients.length}`);

    // Send a welcome message
    res.write(`data: ${JSON.stringify({ message: 'Connected to SSE stream' })}\n\n`);

    // Setup a Redis Pub/Sub connection
    const redis = require('redis');
    const subscriber = redis.createClient({
        host: '127.0.0.1',
        port: 6379,
        password: 'your_secure_password', // Set if using AUTH
    });

    subscriber.on('error', (err) => {
        console.error('Redis subscriber error:', err);
    });

    subscriber.subscribe(`channel:chat:${ticket_id}`, (err, count) => {
        if (err) {
            console.error('Failed to subscribe:', err);
            return;
        }
        console.log(`Subscribed to channel:chat:${ticket_id}`);
    });

    subscriber.on('message', (channel, message) => {
        // Send the message to the client
        res.write(`data: ${JSON.stringify({ message_id: message })}\n\n`);
    });

    // Remove client on close
    req.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        res.socket.server.clients = res.socket.server.clients.filter(c => c.id !== clientId);
        subscriber.quit();
    });
}
```

**Important Notes:**

1. **Persistent Connections:** Next.js API routes are not optimized for long-lived connections like SSE. This implementation works for development or low-traffic scenarios. For production-grade applications, consider using a dedicated SSE server or services optimized for real-time data streaming.

2. **Redis Connection:** Ensure that the Redis client in the SSE endpoint matches the configuration in your CodeIgniter setup.

3. **Client Management:** This simple implementation doesn't handle multiple clients efficiently. For multiple clients subscribed to the same `ticket_id`, consider optimizing the client storage and message broadcasting.

### **C. Integrate the Chat Component into a Page**

**Create `pages/ticket/[id].js`:**

```javascript
import { useRouter } from 'next/router';
import ChatBox from '../../components/ChatBox';

const TicketPage = () => {
    const router = useRouter();
    const { id } = router.query; // ticket ID
    const senderId = 1; // Replace with actual user ID from authentication

    if (!id) return <div>Loading...</div>;

    return (
        <div>
            <h1>Ticket #{id}</h1>
            <ChatBox ticketId={id} senderId={senderId} />
        </div>
    );
};

export default TicketPage;
```

---

## **7. Additional Considerations and Best Practices**

### **A. Security Enhancements**

1. **Secure API Endpoints:**

   - **Authentication Tokens:** Implement JWT or another authentication mechanism to secure your API endpoints. Ensure that only authenticated users can send and receive messages.

   - **Input Validation:** Sanitize and validate all inputs to prevent injection attacks and ensure data integrity.

2. **Secure SSE Connections:**

   - **Token-Based Authentication:** Pass authentication tokens when establishing SSE connections and validate them in the SSE endpoint.

   - **Restrict Access:** Limit SSE connections to authorized users by verifying tokens before subscribing to Redis channels.

### **B. Scalability Improvements**

1. **Optimize SSE Endpoint:**

   - **Shared Subscriptions:** Manage shared Redis subscriptions for multiple clients subscribed to the same `ticket_id` to reduce the number of Redis connections.

2. **Dedicated SSE Server:**

   - **Separate Service:** Consider implementing SSE in a separate, optimized service or microservice designed to handle long-lived connections efficiently.

3. **Load Balancing:**

   - **Distribute Load:** Use load balancers to distribute traffic across multiple backend instances if needed.

### **C. Performance Optimizations**

1. **Redis Configuration:**

   - **Persistence Settings:** Configure Redis persistence (AOF and RDB) based on your durability requirements.

   - **Memory Management:** Monitor and manage Redis memory usage to prevent data loss or performance degradation.

2. **Frontend Optimizations:**

   - **Efficient Rendering:** Optimize the chat interface to handle a large number of messages without performance issues.

   - **Lazy Loading:** Implement lazy loading or pagination for message history to reduce initial load times.

### **D. Monitoring and Logging**

1. **Monitor Redis:**

   - Use tools like **Prometheus** and **Grafana** to monitor Redis performance metrics and set up alerts for critical events.

2. **Log API and SSE Events:**

   - Implement comprehensive logging in both the backend API endpoints and SSE connections to track message flows and detect anomalies.

### **E. Error Handling and Resilience**

1. **Implement Retry Logic:**

   - Ensure that your frontend can gracefully handle temporary network issues or Redis downtimes by implementing retry mechanisms for SSE connections.

2. **Graceful Shutdowns:**

   - Handle server shutdowns gracefully to prevent message loss and ensure that clients are properly disconnected.

---

## **8. Conclusion**

By integrating **Redis** with your **CodeIgniter 3** backend and **Next.js 13** frontend using **Server-Sent Events (SSE)**, you've established a robust foundation for real-time chat functionality within your ticketing system. This setup leverages Redis's strengths in handling real-time data and ensures that hotel staff can efficiently communicate through the chatbox.

**Key Takeaways:**

- **Redis Streams:** Ideal for storing ordered, persistent chat messages with support for consumer groups.
- **SSE for Real-Time Updates:** Enables unidirectional, real-time communication from the server to the client, simplifying the architecture compared to WebSockets.
- **CodeIgniter Integration:** Using phpredis and well-structured controllers, you can seamlessly incorporate Redis into your existing PHP framework.
- **Next.js Frontend:** Leveraging the native SSE API ensures efficient real-time updates in your React-based frontend.

**Next Steps:**

1. **Implement Authentication:**
   - Secure your API endpoints and SSE connections to ensure that only authorized users can send and receive messages.

2. **Optimize for Scalability:**
   - Enhance the SSE implementation to handle multiple clients efficiently and consider moving to a dedicated SSE server for higher traffic.

3. **Enhance Features:**
   - Add functionalities like message history loading, user presence indicators, typing notifications, and more to enrich the chat experience.

4. **Ensure Security:**
   - Regularly audit your system for security vulnerabilities and apply best practices to protect sensitive chat data.

5. **Monitor and Maintain:**
   - Continuously monitor Redis and your backend services to ensure optimal performance and reliability.

Feel free to reach out if you encounter any challenges or need further assistance with specific aspects of the implementation. Happy coding and best of luck with your project!
