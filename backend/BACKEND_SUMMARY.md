# Rankly Backend - High-Level Summary

## 🎯 System Overview

Rankly is a **Multi-LLM GEO/AEO Platform** that helps businesses track and optimize their brand visibility across AI-powered search engines and chatbots (ChatGPT, Claude, Perplexity, Gemini).

## 🏗️ Architecture

```
User → Frontend → Backend API → MongoDB
                    ↓
              OpenRouter API
                    ↓
        (ChatGPT, Claude, Perplexity, Gemini)
```

## 📊 Core Functionality

### 1. **Onboarding & Analysis** 🔍
- **AI-Powered Website Analysis**: Analyzes user's website using Perplexity to extract:
  - Brand context (company name, industry, value proposition, business model)
  - Competitors (similar businesses with URLs)
  - Relevant topics/keywords
  - Target personas/audiences
  
- **Smart Selection**: Users can:
  - Review AI-generated suggestions
  - Add custom competitors/topics/personas
  - Select final items for testing

### 2. **Prompt Generation** 🎯
- **Automated Creation**: Generates test prompts by combining:
  - Selected topics
  - Target personas
  - Query types (Navigational, Commercial, Transactional, Comparative, Reputational)
  
- **Intelligent Prompts**: Each prompt designed to:
  - Trigger natural conversations with LLMs
  - Test brand visibility
  - Capture competitor mentions
  
### 3. **LLM Testing** 🧪
- **Multi-Platform Testing**: Tests each prompt across 4 LLM providers:
  - ChatGPT (OpenAI)
  - Claude (Anthropic)
  - Perplexity
  - Gemini (Google)
  
- **Response Analysis**: For each response, tracks:
  - Brand mentions (yes/no, position)
  - Competitor mentions
  - Citations/links
  - Response quality
  - Word count and depth

### 4. **Metrics & Analytics** 📈
- **Comprehensive Metrics**: Calculates at multiple levels:
  - **Overall**: Across all prompts and platforms
  - **Per Platform**: Individual LLM performance
  - **Per Topic**: Topic-specific rankings
  - **Per Persona**: Audience-specific visibility
  
- **Key Performance Indicators**:
  - **Visibility Score** (0-100): Overall brand presence
  - **Share of Voice** (%): Mention frequency vs competitors
  - **Average Position**: Ranking in responses (1st, 2nd, 3rd, etc.)
  - **Depth of Mention**: Total words about brand
  - **Citation Rate**: % with links/references

### 5. **Dashboard & Insights** 📊
- **Visual Analytics**: Multiple views:
  - Visibility trends
  - Competitor comparisons
  - Topic performance
  - Persona effectiveness
  - Platform breakdown
  
- **Actionable Insights**:
  - Identify weak topics
  - Compare with competitors
  - Track improvement over time
  - Optimize content strategy

## 🗄️ Database Schema

### Core Collections:

1. **Users** 👤
   - Authentication data
   - Profile information
   - Onboarding status

2. **UrlAnalysis** 🔗
   - Website analysis results
   - Brand context
   - AI-extracted data

3. **Competitors** 🏢
   - Competitor brands
   - URLs and metadata
   - Selection status

4. **Topics** 📝
   - Content topics
   - Keywords
   - Priority levels

5. **Personas** 👥
   - Target audiences
   - Pain points & goals
   - Relevance scores

6. **Prompts** 💬
   - Generated test prompts
   - Topic × Persona combinations
   - Query types

7. **PromptTests** 🧪
   - LLM response data
   - Scorecards (metrics)
   - Performance data

8. **AggregatedMetrics** 📊
   - Calculated analytics
   - Brand rankings
   - Comparative data

## 🔄 User Flow

### Phase 1: Setup
```
1. Register/Login
2. Enter website URL
3. AI analyzes website
4. Review & select competitors/topics/personas
5. Generate test prompts
```

### Phase 2: Testing
```
1. Test all prompts across LLMs
2. Collect responses
3. Extract metrics from responses
4. Store results in database
```

### Phase 3: Analysis
```
1. Calculate aggregated metrics
2. Generate rankings
3. Compare with competitors
4. View dashboard analytics
```

### Phase 4: Optimization
```
1. Identify weak areas
2. Adjust topics/prompts
3. Re-test and compare
4. Track improvements
```

## 🛠️ Technical Stack

### Backend:
- **Runtime**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + Passport (OAuth)
- **AI Integration**: OpenRouter API
- **Security**: Helmet, CORS, Rate Limiting

### API Design:
- **RESTful**: Standard HTTP methods
- **JSON**: Request/response format
- **Token Auth**: Bearer tokens
- **Error Handling**: Standardized responses

## 📡 API Categories

### 1. **Authentication** (`/api/auth`)
- User registration/login
- Google OAuth
- Token management

### 2. **Onboarding** (`/api/onboarding`)
- Website analysis
- Data selection
- Prompt generation

### 3. **Analytics** (`/api/analytics`)
- Visibility metrics
- Sentiment analysis
- Citations tracking
- Competitor analysis

### 4. **Metrics** (`/api/metrics`)
- Metric calculation
- Overall/platform/topic/persona views
- Dashboard data

### 5. **Dashboard** (`/api/dashboard`)
- Pre-formatted frontend data
- Combined analytics
- Performance insights

### 6. **Data Management** (`/api/competitors`, `/api/topics`, `/api/personas`)
- CRUD operations
- User customization

### 7. **Prompts** (`/api/prompts`)
- Prompt management
- Test execution
- Results retrieval

### 8. **Clusters** (`/api/clusters`)
- Topic clustering
- Performance grouping

### 9. **URL Analysis** (`/api/url-analysis`)
- Analysis history
- Metrics per URL

### 10. **Cleanup** (`/api/cleanup`)
- Database maintenance
- Orphaned data removal

## 🔑 Key Features

### AI-Powered Analysis
- **Smart Extraction**: Uses LLMs to understand website content
- **Competitor Detection**: Identifies similar businesses automatically
- **Topic Discovery**: Finds relevant keywords and themes
- **Persona Identification**: Determines target audiences

### Multi-LLM Testing
- **Parallel Testing**: Tests across 4 platforms simultaneously
- **Response Parsing**: Extracts structured data from natural language
- **Scoring System**: Comprehensive scorecard for each response

### Advanced Analytics
- **Multi-Dimensional**: Analysis across platforms, topics, personas
- **Competitive Intelligence**: Direct competitor comparison
- **Trend Tracking**: Monitor changes over time
- **Actionable Insights**: Clear recommendations

### Data Management
- **Cleanup Services**: Automatic orphaned data removal
- **Version Control**: Track different URL analyses
- **Selective Testing**: Choose what to test
- **Bulk Operations**: Efficient data handling

## 🚀 Performance Optimizations

1. **Batch Processing**: Tests prompts in configurable batches
2. **Caching**: Stores aggregated metrics for fast retrieval
3. **Indexing**: MongoDB indexes for quick queries
4. **Pagination**: Limits large result sets
5. **Rate Limiting**: Prevents API abuse

## 🔒 Security Features

1. **JWT Authentication**: Secure token-based auth
2. **Password Hashing**: bcrypt for user passwords
3. **CORS Protection**: Configurable origin restrictions
4. **Rate Limiting**: IP-based request throttling
5. **Input Validation**: express-validator for all inputs
6. **Helmet.js**: Security headers

## 📈 Metrics Explained

### Visibility Score (0-100)
- Calculated from: position, mention quality, context
- Higher = Better brand visibility
- Weighted by importance of mention

### Share of Voice (%)
- Formula: (Brand mentions / Total prompts) × 100
- Compared against competitors
- Industry benchmark indicator

### Average Position
- Mean position in responses (1.0 = always first)
- Lower = Better (1st position preferred)
- Tracked across all platforms

### Depth of Mention
- Total words written about brand
- Quality indicator
- Engagement metric

### Citation Rate (%)
- Percentage of responses with citations
- Links, references, or direct mentions
- Trust indicator

## 🎯 Use Cases

### 1. **Brand Monitoring**
- Track brand visibility across AI platforms
- Monitor competitor mentions
- Identify reputation issues

### 2. **SEO/GEO Strategy**
- Optimize for AI search engines
- Identify content gaps
- Improve topic coverage

### 3. **Competitive Analysis**
- Compare with competitors
- Identify market position
- Find competitive advantages

### 4. **Content Strategy**
- Discover effective topics
- Understand audience preferences
- Optimize messaging

### 5. **Market Research**
- Understand AI perceptions
- Identify trends
- Track industry changes

## 🔧 Configuration

### LLM Configuration:
- All LLMs accessed via OpenRouter
- Configurable models per provider
- Fallback handling for failures

## 🧪 Testing Flow

### 1. Prompt Testing Process:
```
For each prompt:
  For each LLM (ChatGPT, Claude, Perplexity, Gemini):
    1. Send prompt to LLM
    2. Receive response
    3. Extract brand mentions
    4. Calculate scorecard
    5. Store results
```

### 2. Scorecard Calculation:
```
- Brand Mentioned: Yes/No
- Brand Position: 1st, 2nd, 3rd, etc.
- Visibility Score: 0-100 (weighted calculation)
- Competitor Mentions: Array of competitors
- Citations: Links/references present
- Response Quality: Various factors
```

### 3. Aggregation:
```
After all tests:
  1. Group by scope (overall/platform/topic/persona)
  2. Calculate aggregate metrics
  3. Rank brands
  4. Generate insights
  5. Store in AggregatedMetrics
```

## 📊 Data Cleanup

### Automatic Cleanup:
- **On Startup**: Removes orphaned data
- **On URL Change**: Cleans previous analysis data
- **Manual Triggers**: Admin cleanup endpoints

### Cleanup Types:
1. **Orphaned Prompts**: Prompts without valid topics/personas
2. **Orphaned Tests**: Tests without valid prompts
3. **Old Metrics**: Outdated aggregated metrics
4. **Duplicate Data**: Deduplication of metrics

## 🌟 Unique Features

### 1. **Multi-LLM Coverage**
- Only platform testing across all major AI providers
- Comprehensive competitive landscape

### 2. **AI-Powered Setup**
- Automated competitor discovery
- Smart topic extraction
- Intelligent persona identification

### 3. **Advanced Analytics**
- Multi-dimensional analysis
- Competitive benchmarking
- Trend tracking

### 4. **Scalable Architecture**
- Batch processing
- Efficient storage
- Optimized queries

### 5. **Actionable Insights**
- Clear metrics
- Visual dashboards
- Improvement recommendations

## 🔄 Continuous Improvement

### Regular Operations:
1. **Re-test**: Run tests periodically
2. **Compare**: Track changes over time
3. **Optimize**: Adjust based on results
4. **Monitor**: Watch competitor changes

### Metrics Refresh:
- Can be triggered manually
- Force refresh option available
- Automatic on new tests

## 📝 Best Practices

### For API Usage:
1. Always include authentication token
2. Handle rate limits gracefully
3. Use appropriate pagination
4. Cache responses when possible
5. Handle errors properly

### For Data Management:
1. Regularly cleanup orphaned data
2. Monitor database size
3. Archive old analyses
4. Backup important data

### For Testing:
1. Start with small batches
2. Monitor API usage
3. Check for errors
4. Verify results

## 🎨 Frontend Integration

### Data Flow:
```
Frontend → API Request → Backend Processing → Database
                              ↓
                    Response with formatted data
                              ↓
                    Frontend displays in UI
```

### Key Integration Points:
1. **Authentication**: JWT token management
2. **Onboarding**: Step-by-step wizard
3. **Testing**: Progress tracking
4. **Analytics**: Real-time updates
5. **Dashboard**: Pre-formatted data

## 🚦 Status & Health

### Health Check: `GET /health`
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "database": "connected"
}
```

### API Info: `GET /api`
Returns list of all available endpoints

## 📚 Documentation

- **API_DOCUMENTATION.md**: Complete API reference
- **ANALYTICS_API_GUIDE.md**: Analytics endpoints guide
- **IMPLEMENTATION_SUMMARY.md**: Implementation details
- **README.md**: Getting started guide

## 🎯 Success Metrics

Platform tracks:
- Total prompts tested
- Total LLM responses
- Brand visibility trends
- Competitor comparisons
- User engagement
- System performance

## 🔮 Future Enhancements

Potential additions:
- Real-time monitoring
- Automated alerts
- Advanced ML predictions
- Custom report generation
- API webhooks
- Multi-user collaboration

---

**Summary**: Rankly backend is a comprehensive API system that analyzes brand visibility across AI platforms, providing actionable insights through multi-dimensional analytics and competitive intelligence.

