--
-- PostgreSQL database dump
--

\restrict GXpMB6L30U7aVLsz8I9eOfYrZpYBqJ1t6PGk0BbPcbxQtrqwINg07K1fySv2uC1

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: screening_criteria; Type: TABLE DATA; Schema: public; Owner: postgres
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.screening_criteria DISABLE TRIGGER ALL;

COPY public.screening_criteria (id, name, description, department_id, form_config_id, is_active, criteria_rules, pass_threshold, use_ai_assist, ai_prompt, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.screening_criteria ENABLE TRIGGER ALL;

--
-- Data for Name: screening_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public.screening_results DISABLE TRIGGER ALL;

COPY public.screening_results (id, application_id, criteria_id, passed, score, details, screened_at) FROM stdin;
\.


ALTER TABLE public.screening_results ENABLE TRIGGER ALL;

--
-- Name: screening_criteria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.screening_criteria_id_seq', 1, false);


--
-- Name: screening_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.screening_results_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict GXpMB6L30U7aVLsz8I9eOfYrZpYBqJ1t6PGk0BbPcbxQtrqwINg07K1fySv2uC1

