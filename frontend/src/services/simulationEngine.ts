import type { LessonPlan, LectureCue, WhiteboardShapeAction } from '../types';

export const LESSON_SCENARIOS: Record<string, { plan: LessonPlan; cues: LectureCue[] }> = {
  'transformers': {
    plan: {
      id: 'lesson-transformers',
      topic: 'Transformers & Self-Attention: The Engine of LLMs',
      overview: 'Understand the seminal 2017 "Attention Is All You Need" architecture that powers ChatGPT, Gemini, and modern generative AI.',
      subject: 'Machine Learning & AI',
      level: 'Intermediate',
      estimatedMinutes: 15,
      modules: [
        {
          id: 'm1',
          title: '1. Why Recurrent Nets Failed & The Self-Attention Breakthrough',
          duration: '3 min',
          status: 'in-progress',
          description: 'How traditional RNNs suffered from sequential bottlenecks and forgetting distant context.',
          keyTakeaways: [
            'Sequential processing cannot be parallelized efficiently on GPUs.',
            'Attention enables O(1) direct information paths between any pair of tokens.'
          ]
        },
        {
          id: 'm2',
          title: '2. The Query, Key, and Value (Q, K, V) Vector Mechanics',
          duration: '4 min',
          status: 'upcoming',
          description: 'The database lookup analogy: Queries asking questions, Keys offering matches, Values holding payload.',
          keyTakeaways: [
            'Dot-product Q · K^T measures semantic affinity.',
            'Dividing by √d_k prevents softmax gradients from vanishing in high dimensions.'
          ]
        },
        {
          id: 'm3',
          title: '3. Multi-Head Attention & Residual Connections',
          duration: '4 min',
          status: 'upcoming',
          description: 'Projecting into 8 or 16 subspaces simultaneously to capture syntax, semantics, and coreference.',
          keyTakeaways: [
            'Each attention head specializes in distinct linguistic relationships.',
            'Skip connections (x + Sublayer(x)) allow gradients to propagate back through 100+ layers.'
          ]
        },
        {
          id: 'm4',
          title: '4. Summary & Interactive Q&A',
          duration: '4 min',
          status: 'upcoming',
          description: 'Wrapping up the complete encoder-decoder pipeline and student questions.',
          keyTakeaways: [
            'Positional encodings provide word order information.',
            'Self-attention scales with O(N^2) context length.'
          ]
        }
      ],
      lectureNotes: [
        'Core Formula: Attention(Q, K, V) = softmax( (Q · K^T) / √d_k ) · V',
        'Input tokens are embedded into dimension d_model (e.g. 768 or 4096).',
        'MultiHead(Q, K, V) = Concat(head_1, ..., head_h) · W_O',
        'Residual connection: LayerNorm(x + Dropout(Sublayer(x)))',
        'Softmax converts raw logits into a normalized probability distribution summing to 1.0.'
      ],
      suggestedQuestions: [
        'Why do we divide the dot product by √d_k in the formula?',
        'How does the model know word order if attention is permutation invariant?',
        'What is the difference between an Encoder-only model like BERT and a Decoder model like GPT?'
      ]
    },
    cues: [
      {
        timeOffsetSec: 0,
        status: 'explaining',
        aiSpeech: "Welcome! Today we are deconstructing the Transformer architecture—the foundational breakthrough powering modern AI. Let's start on the board with the core problem it solved.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-title',
            title: 'Transformer Architecture',
            text: 'Vaswani et al. (2017) "Attention Is All You Need"\n• Solved RNN sequential bottleneck\n• Parallelized training across full sequence\n• Foundation of modern LLMs',
            x: 200,
            y: 100,
            w: 360,
            h: 180,
            color: 'violet'
          }
        ]
      },
      {
        timeOffsetSec: 6,
        status: 'diagramming',
        aiSpeech: "Before Transformers, models like LSTMs had to process words one by one. With Transformers, every word can look directly at every other word in parallel. Watch how input tokens are prepared.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-inputs',
            title: '1. Input Tokens & Embeddings',
            text: 'Sequence: ["The", "animal", "didn\'t", "cross"]\nTokens converted to d_model vectors (e.g., 4096 dimensions).',
            x: 100,
            y: 340,
            w: 260,
            h: 140,
            color: 'blue'
          },
          {
            action: 'create_card',
            id: 'card-pos',
            title: 'Positional Encoding',
            text: 'Sinusoidal waves or RoPE added to vectors so the model knows word order!',
            x: 400,
            y: 340,
            w: 260,
            h: 140,
            color: 'light-blue'
          },
          {
            action: 'create_arrow',
            id: 'arrow-inputs-pos',
            fromId: 'card-inputs',
            toId: 'card-pos',
            label: 'Vector Addition (+)'
          }
        ]
      },
      {
        timeOffsetSec: 13,
        status: 'explaining',
        aiSpeech: "Now, the heart of the system: Scaled Dot-Product Attention. For every token, we compute three vectors: a Query, a Key, and a Value. Let me write out the exact formula on the board.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-formula',
            title: 'Attention Formula',
            text: 'Attention(Q, K, V) = softmax( (Q · K^T) / √d_k ) · V\n\n• Q: What token is searching for\n• K: What tokens offer\n• V: The actual content transmitted',
            x: 720,
            y: 180,
            w: 360,
            h: 210,
            color: 'orange'
          },
          {
            action: 'create_arrow',
            id: 'arrow-pos-formula',
            fromId: 'card-pos',
            toId: 'card-formula',
            label: 'Linear Projections W_q, W_k, W_v'
          }
        ]
      },
      {
        timeOffsetSec: 20,
        status: 'diagramming',
        aiSpeech: "We don't do this just once—we do Multi-Head Attention! By running 8 or 16 attention heads in parallel, head 1 might track grammar, while head 2 tracks pronoun reference.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-multihead',
            title: 'Multi-Head Attention (h=8 or 16)',
            text: 'Head 1: Syntactic subject-verb agreement\nHead 2: Pronoun resolution ("it" -> "animal")\nHead 3: Global document context\nOutputs concatenated and projected via W_O.',
            x: 720,
            y: 440,
            w: 360,
            h: 180,
            color: 'green'
          },
          {
            action: 'create_arrow',
            id: 'arrow-formula-multihead',
            fromId: 'card-formula',
            toId: 'card-multihead',
            label: 'Concat & Project'
          },
          {
            action: 'zoom_to',
            id: 'zoom-overview'
          }
        ]
      },
      {
        timeOffsetSec: 28,
        status: 'listening',
        aiSpeech: "Notice how cleanly the information flows. You are currently muted, but you can unmute anytime to ask a question! Or click one of the suggested questions below.",
        whiteboardActions: []
      }
    ]
  },
  'quantum': {
    plan: {
      id: 'lesson-quantum',
      topic: 'Quantum Computing: Superposition & Entanglement',
      overview: 'Explore how qubits differ from classical bits, how the Hadamard gate induces superposition, and how Einstein’s "spooky action at a distance" works mathematically.',
      subject: 'Quantum Physics',
      level: 'Beginner',
      estimatedMinutes: 12,
      modules: [
        {
          id: 'qm1',
          title: '1. Classical Bit vs. Quantum Qubit',
          duration: '3 min',
          status: 'in-progress',
          description: 'From deterministic 0/1 states to continuous state vectors on the Bloch sphere.',
          keyTakeaways: ['Classical bits are 0 OR 1.', 'Qubits exist as linear combinations: |ψ⟩ = α|0⟩ + β|1⟩.']
        },
        {
          id: 'qm2',
          title: '2. Superposition & The Hadamard Gate',
          duration: '4 min',
          status: 'upcoming',
          description: 'Creating equal probability states using unitary transformations.',
          keyTakeaways: ['H|0⟩ = (|0⟩ + |1⟩) / √2', 'Measurement collapses the wavefunction.']
        },
        {
          id: 'qm3',
          title: '3. Quantum Entanglement & Bell States',
          duration: '5 min',
          status: 'upcoming',
          description: 'Correlating two qubits so measuring one instantly dictates the state of the other.',
          keyTakeaways: ['Bell State: (|00⟩ + |11⟩) / √2', 'No-Communication Theorem guarantees relativity holds.']
        }
      ],
      lectureNotes: [
        'State Vector: |ψ⟩ = α|0⟩ + β|1⟩, where |α|^2 + |β|^2 = 1',
        'Hadamard Gate Matrix: H = 1/√2 [ [1, 1], [1, -1] ]',
        'CNOT Gate creates conditional entanglement across 2 qubits.'
      ],
      suggestedQuestions: [
        'If measuring collapses the superposition, how do we get computation results without ruining the state?',
        'Can quantum entanglement transmit messages faster than light?',
        'What is quantum decoherence and why do quantum computers need extreme cooling?'
      ]
    },
    cues: [
      {
        timeOffsetSec: 0,
        status: 'explaining',
        aiSpeech: "Welcome to Quantum Computing! Let's contrast classical computing with quantum mechanics on our whiteboard.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-q-title',
            title: 'Qubit vs Classical Bit',
            text: 'Classical Bit:\n• State is either exactly 0 OR 1 (like a light switch)\n\nQuantum Qubit:\n• |ψ⟩ = α|0⟩ + β|1⟩\n• Exists in superposition until measured!',
            x: 160,
            y: 120,
            w: 360,
            h: 180,
            color: 'violet'
          }
        ]
      },
      {
        timeOffsetSec: 6,
        status: 'diagramming',
        aiSpeech: "To put a qubit into superposition, we pass it through a quantum gate called the Hadamard gate. Let's sketch the quantum circuit.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-hadamard',
            title: 'Hadamard Gate (H)',
            text: 'Input: |0⟩\nOperation: H|0⟩\nOutput: (|0⟩ + |1⟩) / √2\n\nProbability of measuring 0 = 50%\nProbability of measuring 1 = 50%',
            x: 580,
            y: 120,
            w: 340,
            h: 190,
            color: 'blue'
          },
          {
            action: 'create_arrow',
            id: 'arrow-q-h',
            fromId: 'card-q-title',
            toId: 'card-hadamard',
            label: 'Apply H-Gate'
          }
        ]
      },
      {
        timeOffsetSec: 14,
        status: 'explaining',
        aiSpeech: "Next, we entangle two qubits using a CNOT gate. Once entangled, measuring qubit A instantly determines qubit B, no matter how far apart they are.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-entangle',
            title: 'Bell State (Entanglement)',
            text: '|Φ+⟩ = (|00⟩ + |11⟩) / √2\n\nIf you measure Qubit 1 and find "0", Qubit 2 will ALWAYS be "0".\nIf you measure "1", Qubit 2 will ALWAYS be "1".',
            x: 580,
            y: 360,
            w: 340,
            h: 180,
            color: 'green'
          },
          {
            action: 'create_arrow',
            id: 'arrow-h-entangle',
            fromId: 'card-hadamard',
            toId: 'card-entangle',
            label: 'Pass through CNOT'
          }
        ]
      },
      {
        timeOffsetSec: 22,
        status: 'listening',
        aiSpeech: "Take a moment to inspect the circuit on the board. When you're ready, unmute to ask a question!",
        whiteboardActions: []
      }
    ]
  },
  'rate-limiter': {
    plan: {
      id: 'lesson-rate-limiter',
      topic: 'System Design: Distributed Token Bucket Rate Limiter',
      overview: 'Design a resilient rate limiting architecture capable of handling millions of requests per second with Redis and Lua scripts.',
      subject: 'Distributed Systems',
      level: 'Advanced',
      estimatedMinutes: 20,
      modules: [
        {
          id: 'rl1',
          title: '1. Rate Limiter Algorithms Compared',
          duration: '5 min',
          status: 'in-progress',
          description: 'Token Bucket vs. Leaky Bucket vs. Sliding Window Log vs. Sliding Window Counter.',
          keyTakeaways: ['Token bucket handles bursts well.', 'Sliding window counter provides precise memory footprint.']
        },
        {
          id: 'rl2',
          title: '2. Distributed Architecture with Redis & Lua',
          duration: '8 min',
          status: 'upcoming',
          description: 'Solving race conditions in distributed environments using atomic Lua scripts.',
          keyTakeaways: ['Multi-node race condition avoided via atomic Redis Lua execution.', 'HTTP 429 Too Many Requests response headers.']
        },
        {
          id: 'rl3',
          title: '3. Failure Modes & Edge Cases',
          duration: '7 min',
          status: 'upcoming',
          description: 'What happens when Redis fails? Fail-open vs. fail-close strategies.',
          keyTakeaways: ['Fallback to local memory token bucket during cache downtime.', 'Edge rate-limiting via Cloudflare Workers.']
        }
      ],
      lectureNotes: [
        'Bucket parameters: Capacity C, Refill rate R tokens/second',
        'Redis Hash structure: { "last_refill_ts": 1709827200, "tokens": 9 }',
        'HTTP Headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After'
      ],
      suggestedQuestions: [
        'How do we handle multi-region synchronization without adding 100ms cross-region latency?',
        'Why do we use an atomic Lua script in Redis instead of normal GET and SET?',
        'Should a rate limiter fail-open or fail-closed if Redis goes down?'
      ]
    },
    cues: [
      {
        timeOffsetSec: 0,
        status: 'explaining',
        aiSpeech: "Welcome to this System Design session on Distributed Rate Limiters. Let's outline the high-level architecture on the whiteboard.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-rl-client',
            title: 'Incoming Traffic',
            text: '100,000 requests/sec\nHTTP GET /api/v1/orders\nHeaders: Authorization: Bearer <API_KEY>',
            x: 100,
            y: 200,
            w: 260,
            h: 150,
            color: 'blue'
          },
          {
            action: 'create_card',
            id: 'card-rl-gateway',
            title: 'API Gateway / Rate Limiter Middleware',
            text: '• Extracts Client IP or User ID\n• Evaluates rate limit tier\n• Executes atomic Redis Lua script',
            x: 440,
            y: 200,
            w: 300,
            h: 160,
            color: 'violet'
          },
          {
            action: 'create_arrow',
            id: 'arrow-client-gw',
            fromId: 'card-rl-client',
            toId: 'card-rl-gateway',
            label: 'Ingress Traffic'
          }
        ]
      },
      {
        timeOffsetSec: 8,
        status: 'diagramming',
        aiSpeech: "Behind the gateway sits an in-memory Redis cluster. We use Redis Hashes to store the current token count and timestamp.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-rl-redis',
            title: 'Redis Cluster (Atomic Lua)',
            text: 'Key: `rate:usr_491`\n• tokens: 8\n• last_refreshed: 1725740102\n\nScript calculates: added = (now - last) * rate\nDecrements token if > 0, else returns 0.',
            x: 820,
            y: 120,
            w: 320,
            h: 190,
            color: 'green'
          },
          {
            action: 'create_arrow',
            id: 'arrow-gw-redis',
            fromId: 'card-rl-gateway',
            toId: 'card-rl-redis',
            label: 'Atomic Lua EVAL'
          }
        ]
      },
      {
        timeOffsetSec: 16,
        status: 'explaining',
        aiSpeech: "If tokens are available, the gateway forwards the request to our backend services. If depleted, it immediately returns HTTP 429 Too Many Requests with a Retry-After header.",
        whiteboardActions: [
          {
            action: 'create_card',
            id: 'card-rl-backend',
            title: 'Backend Microservices',
            text: '200 OK\nOrder processed cleanly without database saturation.',
            x: 820,
            y: 350,
            w: 280,
            h: 140,
            color: 'light-blue'
          },
          {
            action: 'create_arrow',
            id: 'arrow-gw-backend',
            fromId: 'card-rl-gateway',
            toId: 'card-rl-backend',
            label: 'Tokens > 0 (Pass)'
          }
        ]
      },
      {
        timeOffsetSec: 24,
        status: 'listening',
        aiSpeech: "That is the core pattern. Notice the read-only board lets you study the flow cleanly. Feel free to unmute and ask how to handle race conditions or failure modes.",
        whiteboardActions: []
      }
    ]
  }
};

export function getScenarioResponse(_topicKey: string, question: string): { speech: string; action: WhiteboardShapeAction } {
  if (question.toLowerCase().includes('square root') || question.toLowerCase().includes('d_k')) {
    return {
      speech: "Great question! We divide by √d_k because for large vector dimensions, the dot products grow large in magnitude. This pushes the softmax function into regions with tiny gradients, causing vanishing gradients during backprop. Scaling by √d_k stabilizes variance to 1.0.",
      action: {
        action: 'create_card',
        id: 'card-qa-sqrt',
        title: 'Why Divide by √d_k?',
        text: 'Variance of dot product = d_k.\nWithout scaling, values become huge, pushing Softmax into saturated flat zones where gradients ≈ 0.\nDividing by √d_k preserves unit variance!',
        x: 400,
        y: 530,
        w: 320,
        h: 170,
        color: 'yellow'
      }
    };
  }

  if (question.toLowerCase().includes('order') || question.toLowerCase().includes('position')) {
    return {
      speech: "Excellent point! Unlike RNNs, the attention formula itself is permutation-invariant: if you shuffle the input words, the attention weights would just shuffle without knowing the sequence. That's why we inject Positional Encodings (like sinusoidal waves or RoPE) directly into the token embeddings before the first layer.",
      action: {
        action: 'create_card',
        id: 'card-qa-order',
        title: 'Permutation Invariance & Order',
        text: 'Self-Attention treats inputs as an unordered set.\nPositional encodings PE(pos, 2i) = sin(pos / 10000^(2i/d))\nprovide unique coordinate signatures to each token position.',
        x: 400,
        y: 530,
        w: 340,
        h: 170,
        color: 'yellow'
      }
    };
  }

  return {
    speech: `That's a thoughtful question regarding "${question}". In this architecture, each component is strictly decoupled to ensure linear scale-up under high throughput, while maintaining exact semantic precision.`,
    action: {
      action: 'create_card',
      id: `card-qa-${Date.now()}`,
      title: 'Tutor Q&A Insight',
      text: `Question: "${question}"\n\nKey Takeaway: The system relies on decoupling latency-sensitive paths from batch processes to ensure deterministic consistency.`,
      x: 420,
      y: 520,
      w: 320,
      h: 160,
      color: 'yellow'
    }
  };
}
