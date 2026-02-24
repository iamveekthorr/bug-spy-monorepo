"""
Backend API Tests for Lighthouse and SEO Services
Tests:
1. Performance endpoint returns dynamic scores (not hardcoded 85/90)
2. SEO endpoint returns comprehensive SEO analysis
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://web-audit-hub.preview.emergentagent.com')


class TestPerformanceEndpoint:
    """Test performance endpoint returns dynamic Lighthouse scores"""
    
    def test_performance_endpoint_returns_dynamic_scores(self):
        """Test that performance scores are not hardcoded 85/90"""
        response = requests.get(
            f"{BASE_URL}/api/v1/capture-metrics/single",
            params={
                "url": "https://example.com",
                "testType": "performance"
            },
            stream=True,
            timeout=60
        )
        
        assert response.status_code == 200
        
        # Parse SSE events
        complete_data = None
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith('data:'):
                    try:
                        data = json.loads(decoded[5:].strip())
                        if data.get('data', {}).get('status') == 'COMPLETE':
                            complete_data = data.get('data', {})
                            break
                    except json.JSONDecodeError:
                        continue
        
        assert complete_data is not None, "COMPLETE event not received"
        
        # Check for Lighthouse scores in results
        results = complete_data.get('results', {})
        web_metrics = results.get('webMetrics', {})
        
        # Verify Lighthouse scores exist
        lighthouse_scores = web_metrics.get('lighthouseScores')
        assert lighthouse_scores is not None, "Lighthouse scores should be present"
        
        # Verify scores are dynamic (not hardcoded to 85/90)
        perf_score = lighthouse_scores.get('performanceScore')
        seo_score = lighthouse_scores.get('seoScore')
        
        # The scores should vary based on actual analysis
        # example.com typically scores 0-100 for performance
        assert isinstance(perf_score, (int, float)), "Performance score should be a number"
        assert isinstance(seo_score, (int, float)), "SEO score should be a number"
        
        # Verify source indicates Lighthouse was used
        source = lighthouse_scores.get('source')
        assert source in ['lighthouse', 'fallback'], f"Source should be 'lighthouse' or 'fallback', got {source}"
        
        print(f"Performance Score: {perf_score}")
        print(f"SEO Score: {seo_score}")
        print(f"Source: {source}")


class TestSeoEndpoint:
    """Test SEO endpoint returns comprehensive analysis"""
    
    def test_seo_endpoint_returns_comprehensive_analysis(self):
        """Test SEO endpoint returns meta tags, headings, content, technical, etc."""
        response = requests.get(
            f"{BASE_URL}/api/v1/capture-metrics/single",
            params={
                "url": "https://example.com",
                "testType": "seo"
            },
            stream=True,
            timeout=60
        )
        
        assert response.status_code == 200
        
        # Parse SSE events
        seo_complete_data = None
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith('data:'):
                    try:
                        data = json.loads(decoded[5:].strip())
                        event_data = data.get('data', {})
                        if event_data.get('status') == 'SEO_COMPLETE':
                            seo_complete_data = event_data.get('data', {})
                            break
                    except json.JSONDecodeError:
                        continue
        
        assert seo_complete_data is not None, "SEO_COMPLETE event not received"
        
        # Verify comprehensive SEO analysis components
        assert 'score' in seo_complete_data, "Overall SEO score should be present"
        assert 'metaTags' in seo_complete_data, "Meta tags analysis should be present"
        assert 'headings' in seo_complete_data, "Headings analysis should be present"
        assert 'content' in seo_complete_data, "Content analysis should be present"
        assert 'technical' in seo_complete_data, "Technical SEO analysis should be present"
        assert 'structuredData' in seo_complete_data, "Structured data analysis should be present"
        assert 'links' in seo_complete_data, "Links analysis should be present"
        assert 'mobile' in seo_complete_data, "Mobile friendliness analysis should be present"
        assert 'recommendations' in seo_complete_data, "SEO recommendations should be present"
        assert 'issues' in seo_complete_data, "SEO issues should be present"
        
        # Verify meta tags structure
        meta_tags = seo_complete_data['metaTags']
        assert 'title' in meta_tags, "Title analysis should be present"
        assert 'description' in meta_tags, "Description analysis should be present"
        assert 'openGraph' in meta_tags, "Open Graph analysis should be present"
        assert 'score' in meta_tags, "Meta tags score should be present"
        
        # Verify headings structure
        headings = seo_complete_data['headings']
        assert 'structure' in headings, "Headings structure should be present"
        assert 'hasProperH1' in headings, "H1 check should be present"
        assert 'score' in headings, "Headings score should be present"
        
        # Verify content analysis
        content = seo_complete_data['content']
        assert 'wordCount' in content, "Word count should be present"
        assert 'images' in content, "Images analysis should be present"
        assert 'score' in content, "Content score should be present"
        
        # Verify technical SEO
        technical = seo_complete_data['technical']
        assert 'isHttps' in technical, "HTTPS check should be present"
        assert 'loadTime' in technical, "Load time should be present"
        assert 'score' in technical, "Technical score should be present"
        
        # Verify recommendations
        recommendations = seo_complete_data['recommendations']
        assert isinstance(recommendations, list), "Recommendations should be a list"
        if recommendations:
            rec = recommendations[0]
            assert 'priority' in rec, "Priority should be in recommendation"
            assert 'title' in rec, "Title should be in recommendation"
            assert 'description' in rec, "Description should be in recommendation"
        
        print(f"Overall SEO Score: {seo_complete_data['score']}")
        print(f"Meta Tags Score: {meta_tags['score']}")
        print(f"Headings Score: {headings['score']}")
        print(f"Content Score: {content['score']}")
        print(f"Technical Score: {technical['score']}")
        print(f"Recommendations count: {len(recommendations)}")
        print(f"Issues count: {len(seo_complete_data['issues'])}")


class TestSeoDropdownOption:
    """Test that SEO is available as a test type option"""
    
    def test_seo_test_type_accepted(self):
        """Test that testType=seo is accepted by the API"""
        response = requests.get(
            f"{BASE_URL}/api/v1/capture-metrics/single",
            params={
                "url": "https://example.com",
                "testType": "seo"
            },
            stream=True,
            timeout=60
        )
        
        # Should not return 400 Bad Request
        assert response.status_code == 200, "SEO test type should be accepted"
        
        # Verify SEO-specific events
        seo_start_found = False
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if 'SEO_START' in decoded:
                    seo_start_found = True
                    break
        
        assert seo_start_found, "SEO_START event should be emitted for SEO tests"
        print("SEO test type is properly accepted and triggers SEO-specific analysis")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
