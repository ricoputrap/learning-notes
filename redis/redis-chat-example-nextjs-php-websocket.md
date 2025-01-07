Certainly! Let's walk through a **complete, real-world implementation** of a chat system using **Redis** within your existing technology stack:

- **Backend:** PHP 7.4 with CodeIgniter 3
- **Frontend:** Next.js 13
- **Real-Time Communication:** WebSockets using Ratchet (a PHP WebSocket library)

This example will cover:

1. **Setting Up Redis in Your Backend**
2. **Creating a CodeIgniter Controller to Handle Messages**
3. **Implementing a WebSocket Server with Ratchet**
4. **Building the Frontend with Next.js to Send and Receive Messages**

---

## **1. Setting Up Redis in Your Backend**

### **A. Install Redis and phpredis Extension**

Ensure that Redis is installed and running on your system. If you're using Docker, you've likely already set it up based on our previous discussions.

**Install Redis on macOS (if not using Docker):**

```bash
brew install redis
brew services start redis
```

**Install phpredis Extension:**

The phpredis extension provides a PHP interface to communicate with Redis. Here's how to install it:

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

### **B. Configure Redis Connection in CodeIgniter**

Create a Redis configuration file in CodeIgniter to manage your Redis connection parameters.

**Create `application/config/redis.php`:**

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$config['redis_host'] = '127.0.0.1';
$config['redis_port'] = 6379;
$config['redis_password'] = 'your_secure_password'; // Set if using AUTH
$config['redis_database'] = 0; // Select the Redis database index
```

**Load Redis Configuration and Initialize Redis in a Library:**

Create a library to manage Redis connections.

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

**Load the Redis Library Automatically:**

To ensure Redis is available across your application, autoload the Redis library.

**Edit `application/config/autoload.php`:**

```php
$autoload['libraries'] = array('database', 'redis_lib');
```

---

## **2. Creating a CodeIgniter Controller to Handle Messages**

We'll create an API endpoint that allows clients to send messages. This controller will handle saving messages to Redis and publishing updates via Pub/Sub.

### **A. Create the Chat Controller**

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
}
```

### **B. Define the Route**

**Edit `application/config/routes.php`:**

```php
$route['chat/send'] = 'chat/send';
```

### **C. Testing the API Endpoint**

You can test the API endpoint using tools like **Postman** or **cURL**.

**Example cURL Request:**

```bash
curl -X POST http://localhost/chat/send \
     -d "ticket_id=12345" \
     -d "sender_id=1" \
     -d "message=Hello, I need assistance with room 101."
```

**Expected Response:**

```json
{
    "status": "success",
    "message_id": "1616690567456-0"
}
```

---

## **3. Implementing a WebSocket Server with Ratchet**

To enable real-time communication, we'll set up a WebSocket server using **Ratchet**, a PHP WebSocket library. This server will subscribe to Redis Pub/Sub channels and broadcast messages to connected clients.

### **A. Install Ratchet and Required Dependencies**

Use **Composer** to install Ratchet and Predis (a PHP Redis client that supports Pub/Sub).

1. **Navigate to Your Project Directory:**

   ```bash
   cd /path/to/your/codeigniter/project
   ```

2. **Initialize Composer (if not already initialized):**

   ```bash
   composer init
   ```

   Follow the prompts to set up your `composer.json`.

3. **Require Ratchet and Predis:**

   ```bash
   composer require cboden/ratchet predis/predis
   ```

### **B. Create the WebSocket Server Script**

Create a PHP script that sets up the WebSocket server, subscribes to Redis channels, and broadcasts messages to clients.

**Create `websocket_server.php` in Your Project Root:**

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Predis\Client as PredisClient;
use React\EventLoop\Factory as LoopFactory;
use React\Socket\Server as ReactServer;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class ChatPusher implements MessageComponentInterface {
    protected $clients;
    protected $redis;

    public function __construct($redis_config) {
        $this->clients = new \SplObjectStorage;
        $this->redis = new PredisClient($redis_config);
    }

    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        // This server doesn't handle incoming messages from clients
        echo "Received message from {$from->resourceId}: {$msg}\n";
    }

    public function onClose(ConnectionInterface $conn) {
        // The connection is closed, remove it
        $this->clients->detach($conn);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }

    /**
     * Broadcast a message to all connected clients
     */
    public function broadcast($data) {
        foreach ($this->clients as $client) {
            $client->send($data);
        }
    }
}

// Load Redis configuration from CodeIgniter's config
$ci = &get_instance();
$ci->load->config('redis');
$redis_config = [
    'scheme' => 'tcp',
    'host'   => $ci->config->item('redis_host'),
    'port'   => $ci->config->item('redis_port'),
    'password' => $ci->config->item('redis_password'),
    'database' => $ci->config->item('redis_database')
];

// Initialize ReactPHP Event Loop
$loop = LoopFactory::create();

// Initialize Ratchet ChatPusher
$chatPusher = new ChatPusher($redis_config);

// Set up Redis Pub/Sub
$redis = new PredisClient($redis_config);
$pubsub = $redis->pubSubLoop();

// Subscribe to all chat channels (assuming ticket IDs are known or pattern-based)
$pubsub->subscribe('channel:chat:*');

// Periodically check for new messages
$loop->addPeriodicTimer(0.1, function() use ($pubsub, $chatPusher) {
    foreach ($pubsub as $message) {
        if ($message->kind === 'message') {
            $channel = $message->channel;
            $message_id = $message->payload;

            // Retrieve the message from Redis Stream
            $stream_key = str_replace('channel:chat:', 'chat:', $channel);
            $stream_message = (new PredisClient())->xRange($stream_key, $message_id, $message_id);

            if (!empty($stream_message)) {
                $msg = $stream_message[0];
                // Broadcast the message to all connected clients
                $chatPusher->broadcast(json_encode([
                    'ticket_id' => substr($stream_key, 5), // Remove 'chat:' prefix
                    'message_id' => $message_id,
                    'sender_id' => $msg['sender_id'],
                    'message' => $msg['message'],
                    'timestamp' => $msg['timestamp']
                ]));
            }
        }
    }
});

// Set up WebSocket Server
$webSock = new ReactServer('0.0.0.0:8080', $loop);
$webServer = new IoServer(
    new HttpServer(
        new WsServer(
            $chatPusher
        )
    ),
    $webSock,
    $loop
);

echo "WebSocket server started on ws://localhost:8080\n";

// Run the event loop
$loop->run();
```

**Important Notes:**

1. **Integration with CodeIgniter:**

   The above script attempts to load CodeIgniter's configurations (`$ci = &get_instance();`). However, running this standalone script may not have access to CodeIgniter's instance. Instead, consider extracting the Redis configuration directly or ensuring the script can access CodeIgniter's configuration files.

2. **Simplified Subscription:**

   The script subscribes to all channels matching `channel:chat:*`. Ensure that your Redis naming conventions align with this pattern.

3. **Running the WebSocket Server:**

   You need to run this script separately from your CodeIgniter application.

### **C. Running the WebSocket Server**

1. **Ensure Composer Dependencies Are Installed:**

   ```bash
   composer install
   ```

2. **Run the WebSocket Server:**

   ```bash
   php websocket_server.php
   ```

   You should see:

   ```
   WebSocket server started on ws://localhost:8080
   ```

   And as clients connect, you'll see:

   ```
   New connection! (1)
   ```

3. **Daemonize the WebSocket Server (Optional):**

   To run the server in the background, consider using **Supervisor** or another process manager.

---

## **4. Building the Frontend with Next.js to Send and Receive Messages**

We'll create a simple chat interface in Next.js that connects to the WebSocket server to receive real-time messages and sends messages via the API endpoint.

### **A. Setting Up the Next.js Project**

If you don't have a Next.js project set up, create one:

```bash
npx create-next-app@latest chat-app
cd chat-app
```

### **B. Install Necessary Dependencies**

Install dependencies for handling WebSockets.

```bash
npm install socket.io-client
```

However, since we're using Ratchet, which follows standard WebSockets, we can use the native WebSocket API or libraries like `socket.io-client` (if you adjust the WebSocket server to use Socket.IO). To keep things simple, we'll use the native WebSocket API.

### **C. Create a Chat Component**

**Create `components/ChatBox.js`:**

```javascript
import { useEffect, useState } from 'react';

const ChatBox = ({ ticketId, senderId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [ws, setWs] = useState(null);

    useEffect(() => {
        // Establish WebSocket connection
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log('WebSocket connection established');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.ticket_id === ticketId) {
                setMessages((prevMessages) => [...prevMessages, data]);
            }
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        setWs(socket);

        return () => {
            socket.close();
        };
    }, [ticketId]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        try {
            const response = await fetch('/api/send-message', {
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

### **D. Create an API Route to Proxy Requests to CodeIgniter**

Since CodeIgniter is running on a different server (e.g., `localhost:80`), you'll need to proxy API requests from Next.js to CodeIgniter.

**Option 1: Use Next.js API Routes to Proxy Requests**

**Create `pages/api/send-message.js`:**

```javascript
export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const response = await fetch('http://localhost/chat/send', { // Adjust the URL as needed
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(req.body),
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

**Option 2: Direct API Calls (CORS Enabled)**

Ensure that your CodeIgniter server allows CORS from your Next.js frontend if they are on different domains or ports.

**Example CORS Headers in CodeIgniter Controller:**

Add these headers before sending the response in `Chat.php`:

```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
```

**Note:** Adjust `Access-Control-Allow-Origin` to restrict access to trusted domains in production.

### **E. Integrate the Chat Component into a Page**

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

### **A. Running the WebSocket Server**

Ensure your WebSocket server (`websocket_server.php`) is running:

```bash
php websocket_server.php
```

You should see:

```
WebSocket server started on ws://localhost:8080
```

### **B. Running the CodeIgniter Backend**

Start your CodeIgniter server (if not already running). If using Docker, ensure the container is up.

### **C. Running the Next.js Frontend**

Start your Next.js development server:

```bash
npm run dev
```

Visit `http://localhost:3000/ticket/12345` (replace `12345` with your ticket ID) to view the chat interface.

---

## **6. Testing the Chat System**

1. **Open Multiple Browser Tabs:**

   - Open `http://localhost:3000/ticket/12345` in multiple tabs or different browsers to simulate multiple users.

2. **Send Messages:**

   - Type a message in one tab and send it.
   - Observe the message appearing in real-time across all connected tabs.

3. **Check Redis Streams and Pub/Sub:**

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

## **7. Enhancements and Best Practices**

### **A. Handling Authentication and Authorization**

- **Secure WebSocket Connections:**
  
  Implement authentication tokens (e.g., JWT) during the WebSocket handshake to ensure only authorized users can connect.

- **Validate User Permissions:**
  
  Ensure that users can only access chat threads (tickets) they're authorized to view.

### **B. Scaling the WebSocket Server**

- **Load Balancing:**
  
  Deploy multiple instances of the WebSocket server behind a load balancer to handle increased traffic.

- **Sticky Sessions:**
  
  Use sticky sessions to ensure that a client's WebSocket connection remains with the same server instance.

### **C. Optimizing Redis Usage**

- **Message Retention:**
  
  Implement policies to retain only recent messages or archive old messages to prevent excessive memory usage.

- **Efficient Data Structures:**
  
  Regularly review and optimize your Redis data structures for performance and memory efficiency.

### **D. Monitoring and Logging**

- **Monitor Redis Performance:**
  
  Use tools like **RedisInsight**, **Prometheus**, and **Grafana** to monitor Redis metrics and set up alerts for critical events.

- **Log WebSocket Events:**
  
  Implement comprehensive logging in your WebSocket server to track connections, disconnections, and message broadcasts.

### **E. Error Handling and Resilience**

- **Implement Retry Mechanisms:**
  
  Ensure that your frontend and backend gracefully handle temporary network issues or Redis downtimes by implementing retry logic.

- **Graceful Shutdowns:**
  
  Handle server shutdowns gracefully to prevent message loss and ensure clients are properly disconnected.

---

## **8. Conclusion**

By following the steps outlined above, you've successfully integrated Redis into your ticketing system's chat functionality using PHP (CodeIgniter 3) and Next.js 13. This setup leverages Redis Streams for message storage and Pub/Sub for real-time updates, with a WebSocket server facilitating instant communication between the backend and frontend.

**Key Takeaways:**

- **Redis Streams:** Ideal for storing ordered, persistent chat messages with support for consumer groups.
- **WebSockets with Ratchet:** Enables real-time communication, allowing clients to receive updates instantly.
- **CodeIgniter Integration:** Using phpredis and Ratchet, you can seamlessly incorporate Redis into your existing PHP framework.
- **Next.js Frontend:** Leveraging the native WebSocket API ensures efficient real-time updates in your React-based frontend.

**Next Steps:**

1. **Implement Authentication:** Secure your WebSocket connections and API endpoints.
2. **Optimize Performance:** Monitor Redis and WebSocket server performance, and scale as needed.
3. **Enhance Features:** Add functionalities like message history loading, user presence indicators, and typing notifications.
4. **Ensure Security:** Regularly audit your system for security vulnerabilities and apply best practices.

Feel free to reach out if you encounter any challenges or need further assistance with specific aspects of the implementation. Happy coding!
