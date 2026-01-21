"""
Factories for the questionnaires domain.

Based on actual models in core/domains/questionnaires/models.py:
- Questionnaire (collections of fields for gathering client information)
- QuestionnaireField (individual fields with various types)
- QuestionnaireResponse (client responses to fields)
"""

import factory
from factory.django import DjangoModelFactory


class QuestionnaireFactory(DjangoModelFactory):
    """
    Factory for creating Questionnaire instances.

    Questionnaire is a collection of fields used in the booking flow
    to gather information from clients.
    """

    class Meta:
        model = 'questionnaires.Questionnaire'

    name = factory.Sequence(lambda n: f'Questionnaire {n}')
    event_type = None  # Optional relationship
    is_active = True
    order = factory.Sequence(lambda n: n + 1)

    class Params:
        """Traits for common questionnaire configurations."""

        inactive = factory.Trait(
            is_active=False
        )

        with_event_type = factory.Trait(
            event_type=factory.SubFactory('core.factories.events.EventTypeFactory')
        )


class QuestionnaireFieldFactory(DjangoModelFactory):
    """
    Factory for creating QuestionnaireField instances.

    QuestionnaireField represents individual input fields within
    a questionnaire with various types and configurations.
    """

    class Meta:
        model = 'questionnaires.QuestionnaireField'

    questionnaire = factory.SubFactory(QuestionnaireFactory)
    name = factory.Sequence(lambda n: f'Field {n}')
    type = 'text'
    required = False
    order = factory.Sequence(lambda n: n + 1)
    options = factory.LazyFunction(list)
    description = ''
    placeholder = ''
    is_guest_count = False
    show_conditions = factory.LazyFunction(dict)
    max_file_size_mb = 10
    allowed_file_types = factory.LazyFunction(list)
    max_files = 1

    class Params:
        """Traits for common field types."""

        required_field = factory.Trait(
            required=True
        )

        text_field = factory.Trait(
            type='text',
            name='Text Field',
            placeholder='Enter text here'
        )

        number_field = factory.Trait(
            type='number',
            name='Number Field',
            placeholder='Enter a number'
        )

        email_field = factory.Trait(
            type='email',
            name='Email Field',
            placeholder='Enter your email'
        )

        phone_field = factory.Trait(
            type='phone',
            name='Phone Field',
            placeholder='Enter your phone number'
        )

        date_field = factory.Trait(
            type='date',
            name='Date Field',
            placeholder='YYYY-MM-DD'
        )

        time_field = factory.Trait(
            type='time',
            name='Time Field',
            placeholder='HH:MM'
        )

        boolean_field = factory.Trait(
            type='boolean',
            name='Yes/No Question'
        )

        select_field = factory.Trait(
            type='select',
            name='Select Field',
            options=['Option A', 'Option B', 'Option C']
        )

        multi_select_field = factory.Trait(
            type='multi-select',
            name='Multi-Select Field',
            options=['Choice 1', 'Choice 2', 'Choice 3']
        )

        file_field = factory.Trait(
            type='file',
            name='File Upload',
            max_file_size_mb=5,
            allowed_file_types=['pdf', 'jpg', 'png'],
            max_files=3
        )

        guests_field = factory.Trait(
            type='guests',
            name='Guest Count',
            options=['Adults', 'Children', 'Infants']
        )

        guest_count_legacy = factory.Trait(
            type='number',
            name='Number of Guests',
            is_guest_count=True
        )

        with_conditions = factory.Trait(
            show_conditions={
                'logic': 'AND',
                'conditions': [
                    {'field_id': '1', 'operator': 'equals', 'value': 'yes'}
                ]
            }
        )


class QuestionnaireResponseFactory(DjangoModelFactory):
    """
    Factory for creating QuestionnaireResponse instances.

    QuestionnaireResponse stores client answers to questionnaire fields,
    associated with a specific event.
    """

    class Meta:
        model = 'questionnaires.QuestionnaireResponse'

    event = factory.SubFactory('core.factories.events.EventFactory')
    field = factory.SubFactory(QuestionnaireFieldFactory)
    value = 'Sample response'

    class Params:
        """Traits for common response types."""

        boolean_yes = factory.Trait(
            value='yes'
        )

        boolean_no = factory.Trait(
            value='no'
        )

        numeric = factory.Trait(
            value='42'
        )

        email_value = factory.Trait(
            value='test@example.com'
        )

        phone_value = factory.Trait(
            value='09123456789'
        )

        date_value = factory.Trait(
            value='2024-06-15'
        )

        time_value = factory.Trait(
            value='14:30'
        )

        guest_count_json = factory.Trait(
            value='{"Adults": 50, "Children": 10, "Infants": 5}'
        )
